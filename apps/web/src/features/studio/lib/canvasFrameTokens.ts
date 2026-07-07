/** CapCut / OpenCut-style canvas transform chrome tokens. */
export const CANVAS_FRAME = {
  elementAccent: '#54D6C9',
  videoAccent: '#6ECAE8',
  /** Selection outline */
  borderColor: 'rgba(255, 255, 255, 0.85)',
  borderWidth: 1,
  /** Corner handle (circular) */
  cornerSize: 10,
  /** Edge bar handles — thin × thick */
  edgeThin: 6,
  edgeThick: 14,
  /** Larger invisible hit target (OpenCut HANDLE_HIT_AREA_SIZE) */
  hitArea: 18,
  handleFill: '#ffffff',
  handleStroke: 'rgba(0, 0, 0, 0.14)',
  /** Distance from top edge to rotation handle center */
  rotationOffset: 26,
} as const;

export const CORNER_ANCHORS = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
] as const;

export const EDGE_ANCHORS = ['middle-left', 'middle-right', 'bottom-center'] as const;
