import { SlidersHorizontal } from 'lucide-react';

/** OpenCut-style empty state for the inspector panel. */
export function RightPanelEmpty() {
  return (
    <div className="studio-right-empty studio-right-empty--opencut">
      <SlidersHorizontal size={40} className="studio-right-empty-icon" aria-hidden />
      <div className="studio-right-empty-copy">
        <p className="studio-right-empty-heading">It&apos;s empty here</p>
        <p className="studio-right-empty-text">
          Select a clip or layer on the timeline to edit its properties
        </p>
      </div>
    </div>
  );
}
