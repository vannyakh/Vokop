import { useState, useRef, useEffect } from 'react';
import { Languages, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useSettingsStore, useTranslation, UI_LANGUAGES } from '@/features/settings';
import type { UiLanguage } from '@/features/settings';
import { FloatGroup, FloatDivider, FloatIconButton } from '@/components/layout/FloatGroup';
import { UserAvatar } from '@/features/auth/components/UserAvatar';

interface UploadTopActionsProps {
  onLoginRequest?: () => void;
}

export function UploadTopActions({ onLoginRequest }: UploadTopActionsProps) {
  const colorTheme = useSettingsStore((s) => s.colorTheme);
  const uiLanguage = useSettingsStore((s) => s.uiLanguage);
  const setUiLanguage = useSettingsStore((s) => s.setUiLanguage);
  const toggleTheme = useSettingsStore((s) => s.toggleTheme);
  const { t } = useTranslation();

  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  const floatTheme = colorTheme === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <>
      <FloatGroup theme={floatTheme} className="pointer-events-auto h-12 px-1.5">
        <div ref={langRef} className="relative">
          <FloatIconButton
            active={langOpen}
            onClick={() => setLangOpen((o) => !o)}
            title={t('changeLanguage')}
          >
            <Languages size={16} className="text-accent" />
          </FloatIconButton>

          {langOpen && (
            <div className="vokop-dropdown absolute top-full right-0 mt-2 min-w-[160px] py-1 rounded-2xl z-50">
              {UI_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    setUiLanguage(lang.code as UiLanguage);
                    setLangOpen(false);
                  }}
                  className={cn(
                    'vokop-dropdown-item w-full text-left px-3 py-2 text-xs font-medium flex items-center justify-between gap-2',
                    uiLanguage === lang.code && 'active',
                  )}
                >
                  <span>{lang.native}</span>
                  <span className="text-[10px] text-faint font-mono">{lang.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <FloatDivider />

        <FloatIconButton
          onClick={toggleTheme}
          title={colorTheme === 'light' ? t('darkMode') : t('lightMode')}
        >
          {colorTheme === 'light' ? (
            <Moon size={16} />
          ) : (
            <Sun size={16} className="text-accent" />
          )}
        </FloatIconButton>

        <FloatDivider />

        <UserAvatar onLoginClick={() => onLoginRequest?.()} />
      </FloatGroup>
    </>
  );
}
