/** Concatenate encoded video chunks into one Annex-B bytestream (Omniclip pattern). */
export class BinaryAccumulator {
  #chunks: Uint8Array[] = [];
  #size = 0;
  #cached: Uint8Array | null = null;

  addChunk(chunk: Uint8Array): void {
    this.#size += chunk.byteLength;
    this.#chunks.push(chunk);
    this.#cached = null;
  }

  get binary(): Uint8Array {
    if (this.#cached) return this.#cached;
    const out = new Uint8Array(this.#size);
    let offset = 0;
    for (const chunk of this.#chunks) {
      out.set(chunk, offset);
      offset += chunk.byteLength;
    }
    this.#cached = out;
    return out;
  }

  get size(): number {
    return this.#size;
  }

  clear(): void {
    this.#chunks = [];
    this.#size = 0;
    this.#cached = null;
  }
}
