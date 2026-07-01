export function StudioBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 studio-grid opacity-40" />
      <div className="absolute -top-32 -left-32 w-96 h-96 blur-[100px] rounded-full bg-[color:color-mix(in_srgb,var(--accent)_18%,transparent)]" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 blur-[100px] rounded-full bg-[color:color-mix(in_srgb,var(--accent-2)_12%,transparent)]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] blur-[120px] rounded-full bg-[color:color-mix(in_srgb,var(--accent-soft)_40%,transparent)]" />
    </div>
  );
}
