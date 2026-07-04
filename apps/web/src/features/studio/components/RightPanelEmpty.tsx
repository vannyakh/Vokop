/** CapCut-style empty state for the right properties panel. */
export function RightPanelEmpty({ message }: { message: string }) {
  return (
    <div className="studio-right-empty">
      <div className="studio-right-empty-art" aria-hidden>
        <span className="studio-right-empty-block" />
        <span className="studio-right-empty-block is-active" />
        <span className="studio-right-empty-block" />
        <span className="studio-right-empty-cursor" />
      </div>
      <p className="studio-right-empty-text">{message}</p>
    </div>
  );
}
