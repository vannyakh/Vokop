export interface GLTransition {
  name: string;
  glsl: string;
  author?: string;
  license?: string;
  defaultParams?: Record<string, number>;
  paramsTypes?: Record<string, string>;
}

/** Map Vokop transition preset ids → gl-transitions shader names. */
export const VOKOP_TO_GL_TRANSITION: Record<string, string> = {
  cut: 'fade',
  dissolve: 'dissolve',
  fade: 'fade',
  'wipe-left': 'wipeLeft',
  'wipe-right': 'wipeRight',
  'slide-up': 'wipeUp',
  'slide-down': 'wipeDown',
  'zoom-in': 'SimpleZoom',
  'zoom-out': 'SimpleZoomOut',
  blur: 'LinearBlur',
  flash: 'Overexposure',
  spin: 'rotate_scale_fade',
};

let catalogPromise: Promise<GLTransition[]> | null = null;

export async function loadGlTransitions(): Promise<GLTransition[]> {
  if (!catalogPromise) {
    catalogPromise = import('gl-transitions').then((mod) => {
      const list = (mod.default ?? mod) as GLTransition[];
      return Array.isArray(list) ? list : [];
    });
  }
  return catalogPromise;
}

export async function findGlTransition(presetId: string): Promise<GLTransition | null> {
  const name = VOKOP_TO_GL_TRANSITION[presetId] ?? presetId;
  const list = await loadGlTransitions();
  return list.find((t) => t.name === name) ?? list.find((t) => t.name.toLowerCase() === name.toLowerCase()) ?? null;
}
