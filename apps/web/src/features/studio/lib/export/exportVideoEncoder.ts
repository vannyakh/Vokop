import type { WebCodecsExportCodec } from '@/features/studio/lib/export/webCodecsSupport';

type WorkerInbound =
  | { action: 'configured' }
  | { action: 'encoded'; frameIndex: number }
  | { action: 'binary'; binary: Uint8Array; codec: string }
  | { action: 'error'; message: string };

/** Omniclip-style WebCodecs H.264/VP9 encoder running in a dedicated worker. */
export class ExportVideoEncoder {
  #worker: Worker;
  #fps = 30;
  #pending = new Map<number, () => void>();
  #nextFrameIndex = 0;
  #closed = false;

  constructor() {
    this.#worker = new Worker(new URL('./encode.worker.ts', import.meta.url), { type: 'module' });
    this.#worker.onmessage = (event: MessageEvent<WorkerInbound>) => {
      const msg = event.data;
      if (msg.action === 'encoded') {
        this.#pending.get(msg.frameIndex)?.();
        this.#pending.delete(msg.frameIndex);
        return;
      }
      if (msg.action === 'error') {
        console.error('[export-encoder]', msg.message);
      }
    };
  }

  async configure(input: {
    width: number;
    height: number;
    bitrate: number;
    fps: number;
    codec: WebCodecsExportCodec;
  }): Promise<void> {
    this.#fps = input.fps;
    this.#nextFrameIndex = 0;
    this.#pending.clear();

    await new Promise<void>((resolve, reject) => {
      const onMessage = (event: MessageEvent<WorkerInbound>) => {
        if (event.data.action === 'configured') {
          this.#worker.removeEventListener('message', onMessage);
          resolve();
        }
        if (event.data.action === 'error') {
          this.#worker.removeEventListener('message', onMessage);
          reject(new Error(event.data.message));
        }
      };
      this.#worker.addEventListener('message', onMessage);
      this.#worker.postMessage({
        action: 'configure',
        width: input.width,
        height: input.height,
        bitrate: input.bitrate,
        fps: input.fps,
        codec: input.codec,
      });
    });
  }

  /** Encode one composited canvas frame (blocks until the worker dequeues it). */
  async encodeCanvas(canvas: HTMLCanvasElement): Promise<void> {
    if (this.#closed) return;
    const frameIndex = this.#nextFrameIndex;
    this.#nextFrameIndex += 1;

    const durationUs = Math.round(1_000_000 / this.#fps);
    const frame = new VideoFrame(canvas, {
      timestamp: frameIndex * durationUs,
      duration: durationUs,
    });

    await new Promise<void>((resolve) => {
      this.#pending.set(frameIndex, resolve);
      this.#worker.postMessage({ action: 'encode', frame, frameIndex }, [frame]);
    });
  }

  async flush(): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const onMessage = (event: MessageEvent<WorkerInbound>) => {
        const msg = event.data;
        if (msg.action === 'binary') {
          this.#worker.removeEventListener('message', onMessage);
          resolve(msg.binary);
        }
        if (msg.action === 'error') {
          this.#worker.removeEventListener('message', onMessage);
          reject(new Error(msg.message));
        }
      };
      this.#worker.addEventListener('message', onMessage);
      this.#worker.postMessage({ action: 'flush' });
    });
  }

  dispose(): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#worker.terminate();
    this.#pending.clear();
  }
}
