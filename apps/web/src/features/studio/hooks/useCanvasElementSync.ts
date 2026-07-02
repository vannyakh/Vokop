import { useEffect, useRef } from 'react';
import { useAppStore } from '@/features/project';
import { mergeSegmentsIntoCanvasElements } from '@/features/studio/lib/canvasElements';

export function useCanvasElementSync(canvasWidth: number, canvasHeight: number) {
  const translatedText = useAppStore((s) => s.translatedText);
  const transcript = useAppStore((s) => s.transcript);
  const duration = useAppStore((s) => s.duration);
  const setCanvasElements = useAppStore((s) => s.setCanvasElements);
  const canvasElementsRef = useRef(useAppStore.getState().canvasElements);

  useEffect(() => {
    canvasElementsRef.current = useAppStore.getState().canvasElements;
  });

  useEffect(() => {
    if (!canvasWidth || !canvasHeight) return;
    const merged = mergeSegmentsIntoCanvasElements(
      translatedText,
      transcript,
      duration,
      canvasElementsRef.current,
      { width: canvasWidth, height: canvasHeight },
    );
    setCanvasElements(merged);
  }, [translatedText, transcript, duration, canvasWidth, canvasHeight, setCanvasElements]);
}
