import { useRef, useState, useEffect, useMemo } from 'react';
import { ChevronDown, HardDrive } from 'lucide-react';
import { cn } from '@/lib/cn';
import { loadStudioFont } from '@/features/studio/lib/fontLoader';
import { registerSystemFontFamily } from '@/features/studio/lib/localFonts';
import { useSystemFonts } from '@/features/studio/hooks/useSystemFonts';
import { STUDIO_FONTS, FONT_CATEGORIES, type FontCategoryId } from '@/features/studio/constants/studioFonts';

type PickerCategoryId = FontCategoryId | 'system';

const PICKER_CATEGORIES: { id: PickerCategoryId; label: string }[] = [
  ...FONT_CATEGORIES,
  { id: 'system', label: 'System' },
];

export function CanvasFontPicker({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (family: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const [catFilter, setCatFilter] = useState<PickerCategoryId>('all');
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const { status: systemStatus, fonts: systemFonts, message: systemMessage, load: loadSystemFonts, supported: systemSupported } =
    useSystemFonts();

  useEffect(() => {
    const load = async () => {
      const newSet = new Set(loadedFonts);
      for (const f of STUDIO_FONTS) {
        await loadStudioFont(f.family);
        newSet.add(f.family);
      }
      setLoadedFonts(newSet);
    };
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  useEffect(() => {
    if (catFilter === 'system' && systemStatus === 'idle' && systemSupported) {
      void loadSystemFonts();
    }
  }, [catFilter, loadSystemFonts, systemStatus, systemSupported]);

  const studioFiltered = useMemo(() => {
    if (catFilter === 'system') return [];
    return catFilter === 'all'
      ? STUDIO_FONTS
      : STUDIO_FONTS.filter((f) => f.category === catFilter);
  }, [catFilter]);

  const display = value ?? 'Default';

  const pickStudio = (family: string) => {
    void loadStudioFont(family);
    onChange(family);
    setOpen(false);
  };

  const pickSystem = async (meta: (typeof systemFonts)[number]) => {
    registerSystemFontFamily(meta);
    await loadStudioFont(meta.family);
    onChange(meta.family);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="canvas-font-picker">
      <button
        type="button"
        className="canvas-font-picker-trigger"
        onClick={() => setOpen((p) => !p)}
        style={{ fontFamily: value ? `${value}, system-ui` : undefined }}
      >
        <span className="truncate flex-1 text-left">{display}</span>
        {value && (
          <button
            type="button"
            className="canvas-font-clear"
            onClick={(e) => {
              e.stopPropagation();
              onChange(undefined);
            }}
            title="Clear font"
          >
            ×
          </button>
        )}
        <ChevronDown size={12} className="shrink-0 opacity-50" />
      </button>

      {open && (
        <div className="canvas-font-dropdown">
          <div className="canvas-font-cats">
            {PICKER_CATEGORIES.filter((cat) => cat.id !== 'system' || systemSupported).map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={cn('canvas-font-cat-btn', catFilter === cat.id && 'active')}
                onClick={() => setCatFilter(cat.id)}
              >
                {cat.id === 'system' ? (
                  <span className="inline-flex items-center gap-1">
                    <HardDrive size={10} />
                    {cat.label}
                  </span>
                ) : (
                  cat.label
                )}
              </button>
            ))}
          </div>

          {catFilter === 'system' ? (
            <div className="canvas-font-list">
              {systemStatus === 'loading' && (
                <p className="canvas-font-system-msg">Loading system fonts…</p>
              )}
              {systemStatus === 'denied' && systemMessage && (
                <p className="canvas-font-system-msg">{systemMessage}</p>
              )}
              {systemStatus === 'unsupported' && (
                <p className="canvas-font-system-msg">System fonts require Chrome or Edge.</p>
              )}
              {systemStatus === 'idle' && (
                <button type="button" className="canvas-font-system-btn" onClick={() => void loadSystemFonts()}>
                  Allow system fonts
                </button>
              )}
              {systemFonts.map((font) => (
                <button
                  key={font.postscriptName}
                  type="button"
                  className={cn('canvas-font-item', value === font.family && 'active')}
                  style={{ fontFamily: `${font.family}, system-ui` }}
                  onClick={() => void pickSystem(font)}
                >
                  {font.family}
                </button>
              ))}
            </div>
          ) : (
            <div className="canvas-font-list">
              {studioFiltered.map((font) => (
                <button
                  key={font.family}
                  type="button"
                  className={cn('canvas-font-item', value === font.family && 'active')}
                  style={{ fontFamily: `${font.family}, system-ui` }}
                  onClick={() => pickStudio(font.family)}
                >
                  {font.family}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
