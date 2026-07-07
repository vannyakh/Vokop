import { useRef, useState, useEffect, useMemo } from 'react';
import { ChevronDown, HardDrive, Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import { loadStudioFont } from '@/features/studio/lib/fontLoader';
import { registerSystemFontFamily } from '@/features/studio/lib/localFonts';
import { useSystemFonts } from '@/features/studio/hooks/useSystemFonts';
import { STUDIO_FONTS, FONT_CATEGORIES, type FontCategoryId } from '@/features/studio/constants/studioFonts';
import { useFontAtlas } from '@/features/studio/fonts/useFontAtlas';
import { isSystemFontFamily } from '@/features/studio/fonts/systemFonts';
import { FontSpritePreview } from '@/features/studio/components/FontSpritePreview';

type PickerCategoryId = FontCategoryId | 'google' | 'system' | 'device';

const PICKER_CATEGORIES: { id: PickerCategoryId; label: string }[] = [
  ...FONT_CATEGORIES,
  { id: 'google', label: 'Google' },
  { id: 'system', label: 'System' },
  { id: 'device', label: 'Device' },
];

const GOOGLE_PREVIEW_LIMIT = 120;

export function CanvasFontPicker({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (family: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const [catFilter, setCatFilter] = useState<PickerCategoryId>('all');
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const { atlas, status: atlasStatus, googleFontNames, systemFontNames, retry: retryAtlas } =
    useFontAtlas({ open });
  const { status: systemStatus, fonts: systemFonts, message: systemMessage, load: loadSystemFonts, supported: systemSupported } =
    useSystemFonts();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSearch('');
      return;
    }
    searchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (catFilter === 'device' && systemStatus === 'idle' && systemSupported) {
      void loadSystemFonts();
    }
  }, [catFilter, loadSystemFonts, systemStatus, systemSupported]);

  const studioFiltered = useMemo(() => {
    if (catFilter === 'google' || catFilter === 'system' || catFilter === 'device') return [];
    const base =
      catFilter === 'all' ? STUDIO_FONTS : STUDIO_FONTS.filter((f) => f.category === catFilter);
    if (!search.trim()) return base;
    const q = search.trim().toLowerCase();
    return base.filter((f) => f.family.toLowerCase().includes(q));
  }, [catFilter, search]);

  const googleFiltered = useMemo(() => {
    if (catFilter !== 'google' && !(catFilter === 'all' && search.trim())) return [];
    const q = search.trim().toLowerCase();
    if (!q) return googleFontNames.slice(0, GOOGLE_PREVIEW_LIMIT);
    return googleFontNames.filter((name) => name.toLowerCase().includes(q)).slice(0, GOOGLE_PREVIEW_LIMIT);
  }, [catFilter, googleFontNames, search]);

  const systemFiltered = useMemo(() => {
    if (catFilter !== 'system') return [];
    if (!search.trim()) return systemFontNames;
    const q = search.trim().toLowerCase();
    return systemFontNames.filter((name) => name.toLowerCase().includes(q));
  }, [catFilter, search, systemFontNames]);

  const display = value ?? 'Default';

  const pickFont = (family: string) => {
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

  const showGoogleSection =
    catFilter === 'google' || (catFilter === 'all' && (search.trim().length > 0 || googleFiltered.length > 0));

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
          <div className="canvas-font-search">
            <Search size={12} className="canvas-font-search-icon" aria-hidden />
            <input
              ref={searchRef}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search fonts…"
              className="canvas-font-search-input"
              aria-label="Search fonts"
            />
          </div>

          <div className="canvas-font-cats">
            {PICKER_CATEGORIES.filter((cat) => cat.id !== 'device' || systemSupported).map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={cn('canvas-font-cat-btn', catFilter === cat.id && 'active')}
                onClick={() => setCatFilter(cat.id)}
              >
                {cat.id === 'device' ? (
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

          {catFilter === 'device' ? (
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
          ) : catFilter === 'system' ? (
            <div className="canvas-font-list">
              {systemFiltered.map((family) => (
                <button
                  key={family}
                  type="button"
                  className={cn('canvas-font-item', value === family && 'active')}
                  style={{ fontFamily: `${family}, system-ui` }}
                  onClick={() => pickFont(family)}
                >
                  {family}
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
                  onClick={() => pickFont(font.family)}
                >
                  {font.family}
                </button>
              ))}

              {showGoogleSection && (
                <>
                  {atlasStatus === 'loading' && (
                    <p className="canvas-font-system-msg">Loading Google font catalog…</p>
                  )}
                  {atlasStatus === 'error' && (
                    <div className="canvas-font-system-msg">
                      <p>Font previews unavailable.</p>
                      <button type="button" className="canvas-font-system-btn" onClick={retryAtlas}>
                        Retry
                      </button>
                    </div>
                  )}
                  {atlasStatus === 'idle' && atlas && (
                    <>
                      {catFilter === 'google' && !search.trim() && (
                        <p className="canvas-font-system-msg">Search 1800+ Google Fonts by name.</p>
                      )}
                      {googleFiltered.map((family) => {
                        const entry = atlas.fonts[family];
                        const isSystem = isSystemFontFamily(family);
                        return (
                          <button
                            key={family}
                            type="button"
                            className={cn('canvas-font-item canvas-font-item--atlas', value === family && 'active')}
                            onClick={() => pickFont(family)}
                            aria-label={family}
                          >
                            {isSystem || !entry ? (
                              <span style={{ fontFamily: `${family}, system-ui` }}>{family}</span>
                            ) : (
                              <FontSpritePreview entry={entry} />
                            )}
                          </button>
                        );
                      })}
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
