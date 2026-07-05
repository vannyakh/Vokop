/// <reference lib="webworker" />
import { BinaryAccumulator } from '@/features/studio/lib/export/binaryAccumulator';

const accumulator = new BinaryAccumulator();

type ExportVideoCodec = 'h264' | 'vp9';

const config: VideoEncoderConfig = {
  codec: 'avc1.640034',
  avc: { format: 'annexb' },
  width: 1280,
  height: 720,
  bitrate: 8_000_000,
  framerate: 30,
  bitrateMode: 'constant',
};

const encoder = new VideoEncoder({
  output: (chunk) => {
    const data = new Uint8Array(chunk.byteLength);
    chunk.copyTo(data);
    accumulator.addChunk(data);
  },
  error: (err) => {
    self.postMessage({ action: 'error', message: err.message });
  },
});

function applyCodec(codec: ExportVideoCodec): void {
  if (codec === 'vp9') {
    config.codec = 'vp09.00.10.08';
    delete (config as VideoEncoderConfig & { avc?: unknown }).avc;
  } else {
    config.codec = 'avc1.640034';
    config.avc = { format: 'annexb' };
  }
}

self.addEventListener('message', async (event: MessageEvent) => {
  const msg = event.data as {
    action: string;
    width?: number;
    height?: number;
    bitrate?: number;
    fps?: number;
    codec?: ExportVideoCodec;
    frame?: VideoFrame;
    frameIndex?: number;
  };

  if (msg.action === 'configure') {
    applyCodec(msg.codec ?? 'h264');
    config.width = msg.width ?? config.width;
    config.height = msg.height ?? config.height;
    config.bitrate = msg.bitrate ?? config.bitrate;
    config.framerate = msg.fps ?? config.framerate;
    accumulator.clear();
    encoder.configure(config);
    self.postMessage({ action: 'configured' });
    return;
  }

  if (msg.action === 'encode' && msg.frame) {
    const frame = msg.frame;
    encoder.encode(frame, { keyFrame: (msg.frameIndex ?? 0) % Math.max(1, Math.round((config.framerate ?? 30) * 2)) === 0 });
    frame.close();
    self.postMessage({ action: 'encoded', frameIndex: msg.frameIndex ?? 0 });
    return;
  }

  if (msg.action === 'flush') {
    await encoder.flush();
    self.postMessage({ action: 'binary', binary: accumulator.binary, codec: config.codec });
  }
});
