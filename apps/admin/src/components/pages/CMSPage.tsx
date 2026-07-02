import React, { useState } from 'react';
import { Palette, Play, Eye, EyeOff, CheckCircle2, ChevronRight, Settings } from 'lucide-react';
import { Button } from '../atoms/Button';

export const CMSPage: React.FC = () => {
  const [themeMode, setThemeMode] = useState<'midnight' | 'emerald' | 'amber'>('midnight');
  const [showBanner, setShowBanner] = useState(true);
  const [announcementText, setAnnouncementText] = useState('🎮 SPECIAL DEAL: Buy Hades II Steam key today and get 15% discount on checkout!');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-transparent">
      {/* Overview header */}
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-2.5">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 select-none">
          <Palette className="w-4 h-4 text-[var(--indigo)]" />
          <span>Storefront CMS (Content Management System)</span>
        </h3>
        <p className="text-xs text-[var(--text-dim)] leading-relaxed max-w-[620px]">
          Customize the aesthetic branding layout of your public catalog checkout pages. Edit banners, banner ads, and color themes in real-time.
        </p>
      </div>

      {isSaved && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-xl text-center select-none flex items-center justify-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Storefront CMS layout and live settings updated. Preview loaded correctly!</span>
        </div>
      )}

      {/* Main split dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Editor (Left) */}
        <form onSubmit={handleSave} className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-5">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider select-none">Branding & Widgets</h4>

          {/* Theme Color Selector */}
          <div className="space-y-2">
            <label className="text-xs text-[var(--text-mid)] font-bold select-none">Storefront Primary Color Accent</label>
            <div className="grid grid-cols-3 gap-3 select-none">
              <button
                type="button"
                onClick={() => setThemeMode('midnight')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  themeMode === 'midnight'
                    ? 'bg-[var(--indigo)]/15 border-[var(--indigo)] text-white'
                    : 'bg-white/2 border-transparent hover:bg-white/4 text-[var(--text-dim)] hover:text-white'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-indigo-500 border border-white/10" />
                <span>Indigo Dusk</span>
              </button>

              <button
                type="button"
                onClick={() => setThemeMode('emerald')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  themeMode === 'emerald'
                    ? 'bg-emerald-500/15 border-emerald-500 text-white'
                    : 'bg-white/2 border-transparent hover:bg-white/4 text-[var(--text-dim)] hover:text-white'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-emerald-500 border border-white/10" />
                <span>Emerald Neon</span>
              </button>

              <button
                type="button"
                onClick={() => setThemeMode('amber')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  themeMode === 'amber'
                    ? 'bg-amber-500/15 border-amber-500 text-white'
                    : 'bg-white/2 border-transparent hover:bg-white/4 text-[var(--text-dim)] hover:text-white'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-amber-500 border border-white/10" />
                <span>Amber Flame</span>
              </button>
            </div>
          </div>

          <div className="h-[1px] bg-[var(--border)]" />

          {/* Banner widget options */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between select-none">
              <div>
                <div className="text-xs font-bold text-white">Homepage Announcement Alert Bar</div>
                <div className="text-[10px] text-[var(--text-dim)] mt-0.5">Toggle live ticker on top of storefront</div>
              </div>
              <button
                type="button"
                onClick={() => setShowBanner(!showBanner)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
                  showBanner
                    ? 'bg-[var(--indigo)]/10 border-[var(--indigo)] text-[var(--indigo)]'
                    : 'bg-white/2 border-[var(--border)] text-[var(--text-dim)]'
                }`}
              >
                {showBanner ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            {showBanner && (
              <div className="space-y-1.5">
                <label className="text-[11px] text-[var(--text-mid)] font-semibold select-none">Ticker Announcement Content</label>
                <input
                  type="text"
                  required
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  className="w-full h-11 bg-white/4 border border-[var(--border)] rounded-xl px-4 text-xs text-[var(--text)] outline-none focus:border-[var(--indigo)] focus:ring-2 focus:ring-[var(--indigo)]/10 transition-all font-semibold"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-[var(--border)] select-none">
            <Button type="submit" className="h-10 text-xs font-bold uppercase px-5">
              Apply Live Layout
            </Button>
          </div>
        </form>

        {/* Live Preview Pane (Right) */}
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5 select-none">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Live Preview Simulator</span>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span>Responsive View</span>
              </span>
            </div>

            {/* Simulating public page */}
            <div className="bg-[#09090d] border border-white/5 rounded-xl p-4 min-h-[220px] relative overflow-hidden flex flex-col justify-between">
              {/* Top alert banner */}
              {showBanner && (
                <div className={`text-[9px] font-bold text-white p-2 rounded-lg text-center select-none flex items-center justify-center gap-1.5 leading-tight ${
                  themeMode === 'midnight' ? 'bg-indigo-600' : themeMode === 'emerald' ? 'bg-emerald-600' : 'bg-amber-600'
                }`}>
                  <Play className="w-2.5 h-2.5 fill-white rotate-90" />
                  <span className="truncate">{announcementText}</span>
                </div>
              )}

              {/* Fake Shop Cover header */}
              <div className="my-3 flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[var(--text-dim)]">
                  <Palette className={`w-4 h-4 ${
                    themeMode === 'midnight' ? 'text-indigo-400' : themeMode === 'emerald' ? 'text-emerald-400' : 'text-amber-400'
                  }`} />
                </span>
                <div className="space-y-0.5 select-none">
                  <div className="text-[11px] font-bold text-white">VOK2Z Key Shop</div>
                  <div className="text-[9px] text-[var(--text-dim)]">5.0 ★ Highly Rated</div>
                </div>
              </div>

              {/* Fake grid of item listings */}
              <div className="grid grid-cols-2 gap-2 select-none">
                <div className="bg-white/2 border border-white/5 rounded-lg p-2 flex flex-col justify-between">
                  <div>
                    <div className="text-[9px] font-bold text-white truncate">Elden Ring Key</div>
                    <div className="text-[8px] text-[var(--text-dim)] font-bold">Steam PC • Region Free</div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] font-black text-white">$59.99</span>
                    <span className={`text-[8px] font-bold uppercase tracking-wider ${
                      themeMode === 'midnight' ? 'text-indigo-400' : themeMode === 'emerald' ? 'text-emerald-400' : 'text-amber-400'
                    }`}>Buy now</span>
                  </div>
                </div>

                <div className="bg-white/2 border border-white/5 rounded-lg p-2 flex flex-col justify-between">
                  <div>
                    <div className="text-[9px] font-bold text-white truncate">Hades II Code</div>
                    <div className="text-[8px] text-[var(--text-dim)] font-bold">Epic Games • Global</div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] font-black text-white">$29.99</span>
                    <span className={`text-[8px] font-bold uppercase tracking-wider ${
                      themeMode === 'midnight' ? 'text-indigo-400' : themeMode === 'emerald' ? 'text-emerald-400' : 'text-amber-400'
                    }`}>Buy now</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-[var(--text-dim)] leading-relaxed select-none text-center italic border-t border-white/5 pt-3">
            Interactive responsive preview mock-up renders immediate layout changes securely without flashing.
          </div>
        </div>
      </div>
    </div>
  );
};
