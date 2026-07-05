import assert from 'node:assert/strict';
import {
  clipRangesForAutoCut,
  computeOnsetStrength,
  detectBeatsFromPeaks,
  samplesToPeaks,
  suggestAutoCuts,
} from '../packages/shared/src/studio/beatDetection.ts';

/** Synthetic kick pattern: sharp peaks every 0.5s (~120 BPM). */
function syntheticKickPeaks(durationSec: number, bpm = 120): number[] {
  const sampleCount = 400;
  const intervalSec = 60 / bpm;
  const peaks = new Array<number>(sampleCount).fill(0.05);
  for (let t = 0; t < durationSec; t += intervalSec) {
    const idx = Math.round((t / durationSec) * (sampleCount - 1));
    peaks[idx] = 1;
    if (idx + 1 < sampleCount) peaks[idx + 1] = 0.4;
  }
  return peaks;
}

function testSamplesToPeaks() {
  const samples = new Float32Array(1000);
  for (let i = 0; i < samples.length; i++) samples[i] = i % 50 === 0 ? 1 : 0.1;
  const peaks = samplesToPeaks(samples, 20);
  assert.equal(peaks.length, 20);
  assert.ok(peaks.some((p) => p >= 0.9));
  console.log('✓ samples to peaks');
}

function testOnsetStrength() {
  const strength = computeOnsetStrength([0.1, 0.2, 0.5, 0.3, 0.1]);
  assert.equal(strength[0], 0);
  assert.equal(strength[2], 0.3);
  console.log('✓ onset strength');
}

function testDetectBeatsSynthetic() {
  const durationSec = 8;
  const peaks = syntheticKickPeaks(durationSec, 120);
  const analysis = detectBeatsFromPeaks(peaks, durationSec, { sensitivity: 0.5 });
  assert.ok(analysis.beats.length >= 10, `expected many beats, got ${analysis.beats.length}`);
  assert.ok(analysis.bpm >= 100 && analysis.bpm <= 140, `bpm=${analysis.bpm}`);
  console.log(`✓ detect beats (~${analysis.bpm} BPM, ${analysis.beats.length} beats)`);
}

function testSuggestAutoCuts() {
  const analysis = detectBeatsFromPeaks(syntheticKickPeaks(6, 120), 6);
  const ranges = clipRangesForAutoCut([{ start: 0, duration: 6 }]);
  const every = suggestAutoCuts(analysis, { clipRanges: ranges, density: 'every-beat' });
  assert.ok(every.length >= 8);
  const sparse = suggestAutoCuts(analysis, { clipRanges: ranges, density: 'every-4' });
  assert.ok(sparse.length < every.length);
  console.log('✓ auto-cut suggestions respect density and clip ranges');
}

function testClipRangeMargin() {
  const ranges = clipRangesForAutoCut([{ start: 0, duration: 2 }], 0.4);
  assert.equal(ranges[0]!.startSec, 0.4);
  assert.equal(ranges[0]!.endSec, 1.6);
  const analysis = { beats: [0.2, 1.0, 1.8], strengths: [1, 1, 1] };
  const cuts = suggestAutoCuts(analysis, { clipRanges: ranges });
  assert.deepEqual(
    cuts.map((c) => c.timeSec),
    [1.0],
  );
  console.log('✓ clip range margin filters edge beats');
}

testSamplesToPeaks();
testOnsetStrength();
testDetectBeatsSynthetic();
testSuggestAutoCuts();
testClipRangeMargin();
console.log('\nAll beat detection tests passed.');
