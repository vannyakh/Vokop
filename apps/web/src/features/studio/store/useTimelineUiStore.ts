import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TimelineUiState {
  snappingEnabled: boolean;
  toggleSnapping: () => void;
  setSnappingEnabled: (enabled: boolean) => void;
}

/** Persisted timeline edit prefs (OpenCut sample: `timeline/timeline-store.ts`). */
export const useTimelineUiStore = create<TimelineUiState>()(
  persist(
    (set) => ({
      snappingEnabled: true,
      toggleSnapping: () => set((s) => ({ snappingEnabled: !s.snappingEnabled })),
      setSnappingEnabled: (enabled) => set({ snappingEnabled: enabled }),
    }),
    {
      name: 'vokop-timeline-ui',
      partialize: (state) => ({ snappingEnabled: state.snappingEnabled }),
    },
  ),
);
