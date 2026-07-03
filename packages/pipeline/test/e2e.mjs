import { execFileSync } from "node:child_process";
import { mkdirSync, statSync } from "node:fs";
import assert from "node:assert";
import {
  parseTimeline,
  computeDuration,
  ingestAsset,
  probe,
  buildRenderArgs,
  planSegments,
  sliceTimeline,
  renderSegments,
  escapeDrawtext,
  atempoChain,
} from "../dist/index.js";

const dir = "/home/claude/pipeline/test/out";
mkdirSync(dir, { recursive: true });

// --- 1. generate two source assets with ffmpeg testsrc ---
execFileSync("ffmpeg", ["-y", "-f", "lavfi", "-i", "testsrc=size=1280x720:rate=30:duration=6",
  "-f", "lavfi", "-i", "sine=frequency=440:duration=6",
  "-c:v", "libx264", "-preset", "ultrafast", "-c:a", "aac", "-shortest", `${dir}/clipA.mp4`]);
execFileSync("ffmpeg", ["-y", "-f", "lavfi", "-i", "smptebars=size=640x360:rate=25:duration=6",
  "-f", "lavfi", "-i", "sine=frequency=880:duration=6",
  "-c:v", "libx264", "-preset", "ultrafast", "-c:a", "aac", "-shortest", `${dir}/clipB.mp4`]);
console.log("sources generated");

// --- 2. probe + ingest ---
const infoA = await probe(`${dir}/clipA.mp4`);
assert(infoA.hasVideo && infoA.hasAudio && infoA.width === 1280, "probe A");
const ingest = await ingestAsset(`${dir}/clipA.mp4`, `${dir}/ingestA`, {
  thumbnails: { count: 4 }, waveform: { samples: 200 },
});
assert(ingest.proxyPath && ingest.thumbnailPaths.length === 4 && ingest.waveformPath, "ingest artifacts");
const proxyInfo = await probe(ingest.proxyPath);
assert(proxyInfo.height <= 720, "proxy height");
console.log("ingest OK — proxy", proxyInfo.width + "x" + proxyInfo.height,
  "thumbs:", ingest.thumbnailPaths.length, "waveform:", !!ingest.waveformPath);

// --- 3. timeline: overlay B on A, text title, audio clip, speed change ---
const timeline = parseTimeline({
  width: 1280, height: 720, fps: 30, background: "#101020",
  tracks: [
    { id: "main", type: "video", clips: [
      { id: "c1", assetId: "A", start: 0, duration: 4, in: 0.5, speed: 1 },
      { id: "c2", assetId: "A", start: 4, duration: 3, in: 1, speed: 2 },
    ]},
    { id: "overlay", type: "video", clips: [
      { id: "c3", assetId: "B", start: 1, duration: 5, in: 0,
        fit: "contain", transform: { x: 320, y: -160, scale: 0.4, opacity: 0.85 } },
    ]},
    { id: "music", type: "audio", clips: [
      { id: "a1", assetId: "B", start: 0, duration: 7, in: 0, volume: 0.5,
        fadeInSec: 0.5, fadeOutSec: 1 },
    ]},
    { id: "titles", type: "text", clips: [
      { id: "t1", start: 0.5, duration: 3, text: "Vokop: 100% test's, done",
        style: { fontSizePx: 56, color: "#FFD24C", backgroundColor: "#000000", x: 0.5, y: 0.12 } },
    ]},
  ],
});
assert(computeDuration(timeline) === 7, "duration");

// --- 4. unit checks ---
assert(escapeDrawtext("a:b'c%d").includes("\\:"), "escape colon");
assert.deepStrictEqual(atempoChain(4), ["atempo=2.0", "atempo=2"], "atempo 4x");
assert.deepStrictEqual(atempoChain(0.25), ["atempo=0.5", "atempo=0.5"], "atempo quarter");
const segs = planSegments(timeline, { targetSegmentSec: 3 });
assert(segs.length >= 2, "segments planned: " + segs.length);
const slice = sliceTimeline(timeline, 4, 7);
const mainSlice = slice.tracks[0].clips;
assert(mainSlice.length === 1 && mainSlice[0].in === 1, "slice keeps c2 with in=1");
const ovSlice = slice.tracks[1].clips[0];
assert(ovSlice.in === 3 && ovSlice.duration === 2, "slice advances overlay in-point");
console.log("unit checks OK — segments:", segs.map(s => `${s.startSec}-${s.endSec}`).join(", "));

// --- 5. single-pass render ---
const assetPaths = { A: `${dir}/clipA.mp4`, B: `${dir}/clipB.mp4` };
const compiled = buildRenderArgs({ timeline, assetPaths, output: `${dir}/single.mp4`,
  video: { preset: "ultrafast" } });
console.log("filtergraph:", compiled.filterComplex.slice(0, 160) + "...");
const { runFFmpeg } = await import("../dist/index.js");
await runFFmpeg({ args: compiled.args, totalDurationSec: compiled.durationSec });
const single = await probe(`${dir}/single.mp4`);
assert(Math.abs(single.durationSec - 7) < 0.3 && single.width === 1280, "single render");
console.log("single-pass render OK —", single.durationSec.toFixed(2) + "s", single.width + "x" + single.height);

// --- 6. segment-parallel render + concat ---
mkdirSync(`${dir}/work`, { recursive: true });
let lastPct = 0;
const { segments } = await renderSegments({
  timeline, assetPaths, output: `${dir}/segmented.mp4`, workDir: `${dir}/work`,
  plan: { targetSegmentSec: 3 }, concurrency: 2,
  video: { preset: "ultrafast" },
  onProgress: (p) => { lastPct = p; },
});
const seg = await probe(`${dir}/segmented.mp4`);
assert(Math.abs(seg.durationSec - 7) < 0.4, "segmented duration " + seg.durationSec);
assert(lastPct === 1, "progress reached 1");
console.log("segmented render OK —", segments.length, "parts,",
  seg.durationSec.toFixed(2) + "s,", Math.round(statSync(`${dir}/segmented.mp4`).size / 1024) + "KB");

console.log("\nALL TESTS PASSED");
