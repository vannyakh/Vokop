import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TimelineUiState {
  snappingEnabled: boolean;
  rippleEditEnabled: boolean;
  toggleSnapping: () => void;
  toggleRippleEdit: () => void;
  setSnappingEnabled: (enabled: boolean) => void;
  setRippleEditEnabled: (enabled: boolean) => void;
}

/** Persisted timeline edit prefs (OpenCut sample: `timeline/timeline-store.ts`). */
export const useTimelineUiStore = create<TimelineUiState>()(
  persist(
    (set) => ({
      snappingEnabled: true,
      rippleEditEnabled: false,
      toggleSnapping: () => set((s) => ({ snappingEnabled: !s.snappingEnabled })),
      toggleRippleEdit: () => set((s) => ({ rippleEditEnabled: !s.rippleEditEnabled })),
      setSnappingEnabled: (enabled) => set({ snappingEnabled: enabled }),
      setRippleEditEnabled: (enabled) => set({ rippleEditEnabled: enabled }),
    }),
    {
      name: 'vokop-timeline-ui',
      partialize: (state) => ({
        snappingEnabled: state.snappingEnabled,
        rippleEditEnabled: state.rippleEditEnabled,
      }),
    },
  ),
);
