import { spawn } from "node:child_process";

/**
 * Thin process wrapper around ffmpeg/ffprobe.
 * No shell is involved — args are passed as an argv array, so paths and
 * filtergraph strings never need shell escaping.
 */

export interface FFmpegProgress {
  /** 0..1 when totalDurationSec is known, otherwise -1 */
  percent: number;
  /** seconds of output produced so far */
  outTimeSec: number;
  fps?: number;
  /** e.g. "3.1x" */
  speed?: string;
}

export interface RunFFmpegOptions {
  /** path to the ffmpeg binary; defaults to "ffmpeg" on PATH */
  bin?: string;
  args: string[];
  /** enables percent computation in progress events */
  totalDurationSec?: number;
  onProgress?: (p: FFmpegProgress) => void;
  signal?: AbortSignal;
  cwd?: string;
}

export class FFmpegError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number | null,
    public readonly stderrTail: string,
    public readonly args: string[],
  ) {
    super(message);
    this.name = "FFmpegError";
  }
}

const STDERR_TAIL_LIMIT = 8_000;

/**
 * Run ffmpeg to completion. Progress is read from `-progress pipe:1`
 * (injected automatically). Rejects with FFmpegError on non-zero exit.
 */
export function runFFmpeg(opts: RunFFmpegOptions): Promise<void> {
  const bin = opts.bin ?? "ffmpeg";
  const args = [
    "-hide_banner",
    "-nostats",
    "-y",
    "-progress",
    "pipe:1",
    ...opts.args,
  ];

  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      cwd: opts.cwd,
      signal: opts.signal,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderrTail = "";
    let stdoutBuf = "";

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderrTail = (stderrTail + chunk).slice(-STDERR_TAIL_LIMIT);
    });

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdoutBuf += chunk;
      let idx: number;
      // progress blocks are newline-delimited key=value pairs ending in "progress=..."
      while ((idx = stdoutBuf.indexOf("progress=")) !== -1) {
        const end = stdoutBuf.indexOf("\n", idx);
        if (end === -1) return; // wait for more data
        const block = stdoutBuf.slice(0, end);
        stdoutBuf = stdoutBuf.slice(end + 1);
        if (opts.onProgress) {
          const p = parseProgressBlock(block, opts.totalDurationSec);
          if (p) opts.onProgress(p);
        }
      }
    });

    child.on("error", (err) => {
      reject(
        new FFmpegError(
          `failed to spawn ${bin}: ${err.message}`,
          null,
          stderrTail,
          args,
        ),
      );
    });

    child.on("close", (code) => {
      if (code === 0) resolve();
      else
        reject(
          new FFmpegError(
            `ffmpeg exited with code ${code}`,
            code,
            stderrTail,
            args,
          ),
        );
    });
  });
}

function parseProgressBlock(
  block: string,
  totalDurationSec?: number,
): FFmpegProgress | undefined {
  const kv = new Map<string, string>();
  for (const line of block.split("\n")) {
    const eq = line.indexOf("=");
    if (eq > 0) kv.set(line.slice(0, eq).trim(), line.slice(eq + 1).trim());
  }
  // out_time_us is microseconds; out_time_ms is (historically) also microseconds
  const us = kv.get("out_time_us") ?? kv.get("out_time_ms");
  if (us === undefined) return undefined;
  const outTimeSec = Math.max(0, Number(us) / 1_000_000);
  const fpsRaw = kv.get("fps");
  return {
    outTimeSec,
    percent:
      totalDurationSec && totalDurationSec > 0
        ? Math.min(1, outTimeSec / totalDurationSec)
        : -1,
    fps: fpsRaw ? Number(fpsRaw) : undefined,
    speed: kv.get("speed"),
  };
}

/** Run ffmpeg and capture binary stdout (used for raw PCM extraction). */
export function runFFmpegCapture(opts: {
  bin?: string;
  args: string[];
  signal?: AbortSignal;
  maxBytes?: number;
}): Promise<Buffer> {
  const bin = opts.bin ?? "ffmpeg";
  const args = ["-hide_banner", "-nostats", "-loglevel", "error", ...opts.args];
  const maxBytes = opts.maxBytes ?? 512 * 1024 * 1024;

  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      signal: opts.signal,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const chunks: Buffer[] = [];
    let total = 0;
    let stderrTail = "";

    child.stdout.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        child.kill("SIGKILL");
        reject(
          new FFmpegError(
            `ffmpeg stdout exceeded ${maxBytes} bytes`,
            null,
            stderrTail,
            args,
          ),
        );
        return;
      }
      chunks.push(chunk);
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (c: string) => {
      stderrTail = (stderrTail + c).slice(-STDERR_TAIL_LIMIT);
    });
    child.on("error", (err) =>
      reject(new FFmpegError(err.message, null, stderrTail, args)),
    );
    child.on("close", (code) => {
      if (code === 0) resolve(Buffer.concat(chunks));
      else
        reject(
          new FFmpegError(
            `ffmpeg exited with code ${code}`,
            code,
            stderrTail,
            args,
          ),
        );
    });
  });
}

/** Run ffprobe and return stdout as a string. */
export function runFFprobe(opts: {
  bin?: string;
  args: string[];
  signal?: AbortSignal;
}): Promise<string> {
  const bin = opts.bin ?? "ffprobe";

  return new Promise((resolve, reject) => {
    const child = spawn(bin, opts.args, {
      signal: opts.signal,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    let stderrTail = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (c: string) => (out += c));
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (c: string) => {
      stderrTail = (stderrTail + c).slice(-STDERR_TAIL_LIMIT);
    });
    child.on("error", (err) =>
      reject(new FFmpegError(err.message, null, stderrTail, opts.args)),
    );
    child.on("close", (code) => {
      if (code === 0) resolve(out);
      else
        reject(
          new FFmpegError(
            `ffprobe exited with code ${code}`,
            code,
            stderrTail,
            opts.args,
          ),
        );
    });
  });
}
