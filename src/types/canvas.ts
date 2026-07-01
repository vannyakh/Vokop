export type CanvasTool = 'select' | 'pan';

export type CanvasElementType = 'text' | 'overlay' | 'logo' | 'image';

export interface CanvasElement {
  id: string;
  type: CanvasElementType;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  rotation: number;
  opacity: number;
  src?: string;
  segmentIndex?: number;
  segmentType?: 'translation' | 'transcript';
  startTime: number;
  endTime: number;
}
