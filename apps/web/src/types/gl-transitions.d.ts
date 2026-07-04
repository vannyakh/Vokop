declare module 'gl-transitions' {
  interface GLTransition {
    name: string;
    glsl: string;
    author?: string;
    license?: string;
    defaultParams?: Record<string, number>;
    paramsTypes?: Record<string, string>;
  }

  const transitions: GLTransition[];
  export default transitions;
}
