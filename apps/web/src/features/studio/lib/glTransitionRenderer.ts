import type { GLTransition } from '@/features/studio/lib/glTransitions';

const VERT = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

function buildFragment(transitionGlsl: string): string {
  return `
precision mediump float;
varying vec2 vUv;
uniform sampler2D from;
uniform sampler2D to;
uniform float progress;
uniform vec2 resolution;

vec4 getFromColor(vec2 uv) { return texture2D(from, uv); }
vec4 getToColor(vec2 uv) { return texture2D(to, uv); }

${transitionGlsl}

void main() {
  gl_FragColor = transition(vUv);
}
`;
}

function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Failed to create shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) ?? 'compile error';
    gl.deleteShader(shader);
    throw new Error(info);
  }
  return shader;
}

function createTexture(gl: WebGLRenderingContext, source: TexImageSource): WebGLTexture {
  const texture = gl.createTexture();
  if (!texture) throw new Error('Failed to create texture');
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  return texture;
}

function makeGradientCanvas(colorA: string, colorB: string, w = 256, h = 144): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, colorA);
  gradient.addColorStop(1, colorB);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  return canvas;
}

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

  // Apply default transition params as uniforms when present.
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
