import { Apple, ExternalLink, HelpCircle, Home, Keyboard, Laptop, MonitorDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/features/settings';
import { ROUTES } from '@/routes/paths';
import {
  StudioHeaderModalShell,
} from '@/features/studio/components/StudioHeaderModalShell';
import { StudioSettingsModal } from '@/features/studio/components/StudioSettingsModal';
import { STUDIO_KEYBOARD_SHORTCUTS } from '@/features/studio/constants/keyboardShortcuts';
import { formatShortcutTokens, type ShortcutToken } from '@/features/studio/lib/shortcutKeys';

export type StudioHeaderModalId = 'desktop' | 'workspace' | 'help' | 'settings';

interface StudioHeaderModalsProps {
  active: StudioHeaderModalId | null;
  onClose: () => void;
}

function ShortcutKeys({ keys }: { keys: ShortcutToken[] }) {
  const formatted = formatShortcutTokens(keys);
  return (
    <span className="studio-header-modal-shortcut-keys">
      {formatted.map((key, i) => (
        <kbd key={`${key}-${i}`} className="studio-header-modal-kbd">
          {key}
        </kbd>
      ))}
    </span>
  );
}

export function StudioHeaderModals({ active, onClose }: StudioHeaderModalsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const goHome = () => {
    onClose();
    navigate(ROUTES.home);
  };

  return (
    <>
      <StudioHeaderModalShell
        open={active === 'desktop'}
        width={420}
        title={t('headerDesktopTitle')}
        subtitle={t('headerDesktopSubtitle')}
        onCancel={onClose}
      >
        <div className="studio-header-modal-body">
          <div className="studio-header-modal-grid studio-header-modal-grid--2">
            <div className="studio-header-modal-card studio-header-modal-card--soon">
              <div className="studio-header-modal-card-icon">
                <Apple size={22} />
              </div>
              <div className="studio-header-modal-card-text">
                <div className="studio-header-modal-card-title">{t('headerDesktopMac')}</div>
                <div className="studio-header-modal-card-hint">{t('headerDesktopMacHint')}</div>
              </div>
              <span className="studio-header-modal-badge">{t('headerDesktopSoon')}</span>
            </div>
            <div className="studio-header-modal-card studio-header-modal-card--soon">
              <div className="studio-header-modal-card-icon">
                <Laptop size={22} />
              </div>
              <div className="studio-header-modal-card-text">
                <div className="studio-header-modal-card-title">{t('headerDesktopWindows')}</div>
                <div className="studio-header-modal-card-hint">{t('headerDesktopWindowsHint')}</div>
              </div>
              <span className="studio-header-modal-badge">{t('headerDesktopSoon')}</span>
            </div>
          </div>
          <p className="studio-header-modal-note">
            <MonitorDown size={14} aria-hidden="true" />
            {t('headerDesktopNote')}
          </p>
        </div>
      </StudioHeaderModalShell>

      <StudioHeaderModalShell
        open={active === 'workspace'}
        width={420}
        title={t('headerWorkspaceTitle')}
        subtitle={t('headerWorkspaceSubtitle')}
        onCancel={onClose}
      >
        <div className="studio-header-modal-body">
          <button type="button" className="studio-header-modal-action" onClick={goHome}>
            <span className="studio-header-modal-action-icon">
              <Home size={18} />
            </span>
            <span className="studio-header-modal-action-text">
              <span className="studio-header-modal-action-title">{t('headerWorkspaceHome')}</span>
              <span className="studio-header-modal-action-hint">{t('headerWorkspaceHomeHint')}</span>
            </span>
            <ExternalLink size={14} className="studio-header-modal-action-arrow" aria-hidden="true" />
          </button>
        </div>
      </StudioHeaderModalShell>

      <StudioHeaderModalShell
        open={active === 'help'}
        width={720}
        title={t('headerHelpTitle')}
        subtitle={t('headerHelpSubtitle')}
        onCancel={onClose}
      >
        <div className="studio-header-modal-body studio-header-modal-body--help">
          <section className="studio-header-modal-block">
            <header className="studio-header-modal-block-head">
              <HelpCircle size={14} aria-hidden="true" />
              <span>{t('menuVokopHelp')}</span>
            </header>
            <button
              type="button"
              className="studio-header-modal-action studio-header-modal-action--disabled"
              disabled
            >
              <span className="studio-header-modal-action-icon">
                <ExternalLink size={18} />
              </span>
              <span className="studio-header-modal-action-text">
                <span className="studio-header-modal-action-title">{t('headerHelpDocs')}</span>
                <span className="studio-header-modal-action-hint">{t('headerDesktopSoon')}</span>
              </span>
            </button>
          </section>

          <section className="studio-header-modal-block">
            <header className="studio-header-modal-block-head">
              <Keyboard size={14} aria-hidden="true" />
              <span>{t('menuShortcuts')}</span>
            </header>
            <div className="studio-header-modal-shortcuts-grid">
              {STUDIO_KEYBOARD_SHORTCUTS.map((group) => (
                <div key={group.id} className="studio-header-modal-shortcuts-column">
                  <h3 className="studio-header-modal-shortcuts-column-title">
                    {t(group.titleKey as any)}
                  </h3>
                  <ul className="studio-header-modal-shortcuts">
                    {group.items.map((item) => (
                      <li key={item.labelKey} className="studio-header-modal-shortcut-row">
                        <span className="studio-header-modal-shortcut-label">
                          {t(item.labelKey as any)}
                        </span>
                        <ShortcutKeys keys={item.keys} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>
      </StudioHeaderModalShell>

      <StudioSettingsModal open={active === 'settings'} onClose={onClose} />
    </>
  );
}
