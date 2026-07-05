/// <reference lib="webworker" />

type DecoderInbound =
  | { action: 'configured'; sourceId: string }
  | { action: 'frame'; sourceId: string; timestampUs: number; frame: VideoFrame }
  | { action: 'error'; sourceId?: string; message: string };

interface SourceDecoder {
  decoder: VideoDecoder;
  pending: Array<(frame: VideoFrame | null) => void>;
}

const sources = new Map<string, SourceDecoder>();

function postError(message: string, sourceId?: string): void {
  self.postMessage({ action: 'error', sourceId, message } satisfies DecoderInbound);
}

function takeFrame(sourceId: string, timestampUs: number, frame: VideoFrame): void {
  self.postMessage(
    { action: 'frame', sourceId, timestampUs, frame } satisfies DecoderInbound,
    [frame],
  );
}

self.addEventListener('message', (event: MessageEvent) => {
  const msg = event.data as {
    action: string;
    sourceId?: string;
    config?: VideoDecoderConfig;
    chunk?: EncodedVideoChunk;
    timestampUs?: number;
    flush?: boolean;
  };

  if (msg.action === 'configure' && msg.sourceId && msg.config) {
    const existing = sources.get(msg.sourceId);
    existing?.decoder.close();

    const state: SourceDecoder = {
      decoder: new VideoDecoder({
        output: (frame) => {
          takeFrame(msg.sourceId!, frame.timestamp, frame);
        },
        error: (err) => postError(err.message, msg.sourceId),
      }),
      pending: [],
    };

    state.decoder.configure(msg.config);
    sources.set(msg.sourceId, state);
    self.postMessage({ action: 'configured', sourceId: msg.sourceId } satisfies DecoderInbound);
    return;
  }

  if (msg.action === 'decode' && msg.sourceId && msg.chunk) {
    const state = sources.get(msg.sourceId);
    if (!state) {
      postError('Decoder not configured', msg.sourceId);
      return;
    }
    state.decoder.decode(msg.chunk);
    return;
  }

  if (msg.action === 'flush' && msg.sourceId) {
    const state = sources.get(msg.sourceId);
    if (!state) return;
    void state.decoder.flush().catch((err: Error) => postError(err.message, msg.sourceId));
    return;
  }

  if (msg.action === 'close' && msg.sourceId) {
    const state = sources.get(msg.sourceId);
    state?.decoder.close();
    sources.delete(msg.sourceId);
    return;
  }

  if (msg.action === 'closeAll') {
    for (const state of sources.values()) state.decoder.close();
    sources.clear();
  }
});
