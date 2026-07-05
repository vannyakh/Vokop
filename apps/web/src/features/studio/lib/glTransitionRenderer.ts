import type { GLTransition } from '@/features/studio/lib/glTransitions';
import {
  buildFragment,
  createShader,
  createTexture,
  makeGradientCanvas,
  VERT,
} from '@/features/studio/lib/glTransitionRenderer.shared';

export interface TransitionRenderer {
  setProgress: (progress: number) => void;
  dispose: () => void;
}

/** Render a gl-transition between two placeholder frames on a canvas. */
export function createTransitionRenderer(
  canvas: HTMLCanvasElement,
  transition: GLTransition,
): TransitionRenderer {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: false, alpha: false });
  if (!gl) throw new Error('WebGL not available');

  const program = gl.createProgram();
  if (!program) throw new Error('Failed to create program');

  const vs = createShader(gl, gl.VERTEX_SHADER, VERT);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, buildFragment(transition.glsl));
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? 'link error');
  }
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const positionLoc = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

  const fromTex = createTexture(gl, makeGradientCanvas('#1a1a1a', '#c9a227'));
  const toTex = createTexture(gl, makeGradientCanvas('#0d3b4c', '#e8e8e8'));

  const fromLoc = gl.getUniformLocation(program, 'from');
  const toLoc = gl.getUniformLocation(program, 'to');
  const progressLoc = gl.getUniformLocation(program, 'progress');
  const resolutionLoc = gl.getUniformLocation(program, 'resolution');

  for (const [key, value] of Object.entries(transition.defaultParams ?? {})) {
    const loc = gl.getUniformLocation(program, key);
    if (loc && typeof value === 'number') gl.uniform1f(loc, value);
  }

  const draw = (progress: number) => {
    const w = canvas.width;
    const h = canvas.height;
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fromTex);
    gl.uniform1i(fromLoc, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, toTex);
    gl.uniform1i(toLoc, 1);

    gl.uniform1f(progressLoc, Math.min(1, Math.max(0, progress)));
    gl.uniform2f(resolutionLoc, w, h);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  draw(0);

  return {
    setProgress: draw,
    dispose: () => {
      gl.deleteTexture(fromTex);
      gl.deleteTexture(toTex);
      gl.deleteBuffer(buffer);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteProgram(program);
    },
  };
}
