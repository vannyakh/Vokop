import type { GLTransition } from '@/features/studio/lib/glTransitions';
import { findGlTransition } from '@/features/studio/lib/glTransitions';
import {
  createShader,
  createTexture,
  buildFragment,
  VERT,
} from '@/features/studio/lib/glTransitionRenderer.shared';

export interface ExportTransitionBlender {
  draw(input: {
    from: CanvasImageSource;
    to: CanvasImageSource;
    presetId: string;
    progress: number;
    width: number;
    height: number;
  }): Promise<HTMLCanvasElement>;
  dispose(): void;
}

interface CachedProgram {
  transition: GLTransition;
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  vs: WebGLShader;
  fs: WebGLShader;
  buffer: WebGLBuffer;
  fromLoc: WebGLUniformLocation | null;
  toLoc: WebGLUniformLocation | null;
  progressLoc: WebGLUniformLocation | null;
  resolutionLoc: WebGLUniformLocation | null;
  positionLoc: number;
}

/** GL transition blender for export — composites real clip frames (not placeholders). */
export function createExportTransitionBlender(): ExportTransitionBlender {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl', { premultipliedAlpha: false, alpha: false });
  if (!gl) throw new Error('WebGL not available for export transitions');

  const programs = new Map<string, CachedProgram>();

  const ensureProgram = async (presetId: string): Promise<CachedProgram | null> => {
    const cached = programs.get(presetId);
    if (cached) return cached;

    const transition = await findGlTransition(presetId);
    if (!transition) return null;

    const program = gl.createProgram();
    if (!program) return null;

    const vs = createShader(gl, gl.VERTEX_SHADER, VERT);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, buildFragment(transition.glsl));
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteProgram(program);
      return null;
    }

    const buffer = gl.createBuffer();
    if (!buffer) return null;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    gl.useProgram(program);
    const positionLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    for (const [key, value] of Object.entries(transition.defaultParams ?? {})) {
      const loc = gl.getUniformLocation(program, key);
      if (loc && typeof value === 'number') gl.uniform1f(loc, value);
    }

    const entry: CachedProgram = {
      transition,
      gl,
      program,
      vs,
      fs,
      buffer,
      fromLoc: gl.getUniformLocation(program, 'from'),
      toLoc: gl.getUniformLocation(program, 'to'),
      progressLoc: gl.getUniformLocation(program, 'progress'),
      resolutionLoc: gl.getUniformLocation(program, 'resolution'),
      positionLoc,
    };
    programs.set(presetId, entry);
    return entry;
  };

  const draw = async (input: {
    from: CanvasImageSource;
    to: CanvasImageSource;
    presetId: string;
    progress: number;
    width: number;
    height: number;
  }): Promise<HTMLCanvasElement> => {
    const programState = await ensureProgram(input.presetId);
    if (!programState) return canvas;

    const { gl: context, program } = programState;
    canvas.width = Math.max(2, input.width);
    canvas.height = Math.max(2, input.height);

    context.useProgram(program);
    context.viewport(0, 0, canvas.width, canvas.height);
    context.clearColor(0, 0, 0, 1);
    context.clear(context.COLOR_BUFFER_BIT);

    const fromTex = createTexture(context, input.from as TexImageSource);
    const toTex = createTexture(context, input.to as TexImageSource);

    context.activeTexture(context.TEXTURE0);
    context.bindTexture(context.TEXTURE_2D, fromTex);
    context.uniform1i(programState.fromLoc, 0);

    context.activeTexture(context.TEXTURE1);
    context.bindTexture(context.TEXTURE_2D, toTex);
    context.uniform1i(programState.toLoc, 1);

    context.uniform1f(programState.progressLoc, Math.min(1, Math.max(0, input.progress)));
    context.uniform2f(programState.resolutionLoc, canvas.width, canvas.height);
    context.drawArrays(context.TRIANGLE_STRIP, 0, 4);

    context.deleteTexture(fromTex);
    context.deleteTexture(toTex);
    return canvas;
  };

  return {
    draw,
    dispose: () => {
      for (const entry of programs.values()) {
        entry.gl.deleteBuffer(entry.buffer);
        entry.gl.deleteShader(entry.vs);
        entry.gl.deleteShader(entry.fs);
        entry.gl.deleteProgram(entry.program);
      }
      programs.clear();
    },
  };
}
