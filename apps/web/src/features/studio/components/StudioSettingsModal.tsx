import { useEffect, useState, type ReactNode } from 'react';
import { Check, FolderKanban, Palette, SlidersHorizontal } from 'lucide-react';
import { Select, Switch } from '@vokop/ui/antd';
import { VokopModal } from '@vokop/ui';
import { cn } from '@/lib/cn';
import { useSettingsStore, useTranslation, UI_LANGUAGES, type UiLanguage } from '@/features/settings';
import { STUDIO_MODAL_STYLES } from '@/features/studio/lib/studioModalTheme';

type SettingsSection = 'general' | 'editor' | 'projects';

type EditorDraftSettings = {
  snapToGrid: boolean;
  showWaveforms: boolean;
  defaultTool: 'select' | 'pan';
  timeDisplay: 'timecode' | 'seconds';
  rippleEdit: boolean;
};

type ProjectDraftSettings = {
  defaultRatio: '16:9' | '9:16' | '1:1';
  autoSave: boolean;
  autoSaveInterval: '30s' | '1m' | '5m';
  openLastProject: boolean;
  confirmBeforeClose: boolean;
};

const DEFAULT_EDITOR_SETTINGS: EditorDraftSettings = {
  snapToGrid: true,
  showWaveforms: true,
  defaultTool: 'select',
  timeDisplay: 'timecode',
  rippleEdit: false,
};

const DEFAULT_PROJECT_SETTINGS: ProjectDraftSettings = {
  defaultRatio: '16:9',
  autoSave: true,
  autoSaveInterval: '1m',
  openLastProject: false,
  confirmBeforeClose: true,
};

const SETTINGS_SELECT_POPUP = {
  classNames: { popup: { root: 'studio-settings-select-dropdown' } },
  styles: { popup: { root: { backgroundColor: '#141414' } } },
} as const;

interface StudioSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

function SettingsGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('studio-settings-group', className)}>{children}</div>;
}

function SettingsGroupLabel({ children }: { children: ReactNode }) {
  return <div className="studio-settings-group-label">{children}</div>;
}

function SettingsPickerRow({
  label,
  detail,
  selected,
  icon,
  onClick,
}: {
  label: string;
  detail?: string;
  selected: boolean;
  icon?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" className="studio-settings-row studio-settings-row--picker" onClick={onClick}>
      <span className="studio-settings-row__main">
        {icon ? <span className="studio-settings-row__icon">{icon}</span> : null}
        <span className="studio-settings-row__label">{label}</span>
        {detail ? <span className="studio-settings-row__detail">{detail}</span> : null}
      </span>
      {selected ? <Check size={14} strokeWidth={2.5} className="studio-settings-row__check" aria-hidden="true" /> : null}
    </button>
  );
}

function SettingsToggleRow({
  title,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="studio-settings-row studio-settings-row--toggle">
      <span className="studio-settings-row__label">{title}</span>
      <Switch
        className="studio-settings-switch"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
    </div>
  );
}

function SettingsValueRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: ReactNode;
}) {
  return (
    <div className="studio-settings-row studio-settings-row--value">
      <span className="studio-settings-row__label">{label}</span>
      {children ?? (value ? <span className="studio-settings-row__value">{value}</span> : null)}
    </div>
  );
}

function SettingsSelectRow<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
  selectClassName,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
  selectClassName?: string;
}) {
  return (
    <SettingsValueRow label={label}>
      <Select
        className={cn('studio-settings-inline-select', selectClassName)}
        size="small"
        variant="borderless"
        {...SETTINGS_SELECT_POPUP}
        value={value}
        disabled={disabled}
        onChange={(next) => onChange(next as T)}
        options={options}
        popupMatchSelectWidth={false}
      />
    </SettingsValueRow>
  );
}

export function StudioSettingsModal({ open, onClose }: StudioSettingsModalProps) {
  const { t } = useTranslation();
  const colorTheme = useSettingsStore((s) => s.colorTheme);
  const uiLanguage = useSettingsStore((s) => s.uiLanguage);
  const setUiLanguage = useSettingsStore((s) => s.setUiLanguage);
  const toggleTheme = useSettingsStore((s) => s.toggleTheme);

  const [section, setSection] = useState<SettingsSection>('general');
  const [editorSettings, setEditorSettings] = useState<EditorDraftSettings>(DEFAULT_EDITOR_SETTINGS);
  const [projectSettings, setProjectSettings] = useState<ProjectDraftSettings>(DEFAULT_PROJECT_SETTINGS);

  useEffect(() => {
    if (!open) return;
    setSection('general');
  }, [open]);

  const setTheme = (theme: 'light' | 'dark') => {
    if (theme !== colorTheme) toggleTheme();
  };

  const setEditor = <K extends keyof EditorDraftSettings>(key: K, value: EditorDraftSettings[K]) => {
    setEditorSettings((current) => ({ ...current, [key]: value }));
  };

  const setProject = <K extends keyof ProjectDraftSettings>(key: K, value: ProjectDraftSettings[K]) => {
    setProjectSettings((current) => ({ ...current, [key]: value }));
  };

  const navItems: { id: SettingsSection; label: string; icon: typeof Palette }[] = [
    { id: 'general', label: t('settingsNavGeneral' as any), icon: Palette },
    { id: 'editor', label: t('settingsNavEditor' as any), icon: SlidersHorizontal },
    { id: 'projects', label: t('settingsNavProjects' as any), icon: FolderKanban },
  ];

  const intervalLabels: Record<ProjectDraftSettings['autoSaveInterval'], string> = {
    '30s': t('settingsProjectsInterval30s' as any),
    '1m': t('settingsProjectsInterval1m' as any),
    '5m': t('settingsProjectsInterval5m' as any),
  };

  return (
    <VokopModal
      open={open}
      width={540}
      draggable
      className="studio-modal studio-settings-modal"
      styles={STUDIO_MODAL_STYLES}
      onCancel={onClose}
      footer={null}
    >
      <div className="studio-settings-shell">
        <header className="studio-modal-head studio-settings-head vokop-modal-drag-handle">
          <h2 className="studio-modal-head__title">{t('headerSettingsTitle')}</h2>
        </header>
        <div className="studio-settings-topbar" aria-hidden="true" />
        <nav className="studio-settings-sidebar" aria-label={t('headerSettingsTitle' as any)}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={cn('studio-settings-nav-item', active && 'studio-settings-nav-item--active')}
                aria-current={active ? 'page' : undefined}
                onClick={() => setSection(item.id)}
              >
                <Icon size={15} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="studio-settings-panel studio-scrollbar">
          {section === 'general' ? (
            <div className="studio-settings-section">
              <SettingsGroup>
                <SettingsSelectRow
                  label={t('headerSettingsTheme')}
                  value={colorTheme}
                  onChange={setTheme}
                  options={[
                    { value: 'dark', label: t('darkMode') },
                    { value: 'light', label: t('lightMode') },
                  ]}
                />
                <SettingsSelectRow
                  label={t('headerSettingsLanguage')}
                  value={uiLanguage}
                  selectClassName="studio-settings-inline-select--wide"
                  onChange={(code) => setUiLanguage(code as UiLanguage)}
                  options={UI_LANGUAGES.map((lang) => ({
                    value: lang.code,
                    label: `${lang.native} · ${lang.label}`,
                  }))}
                />
              </SettingsGroup>
            </div>
          ) : null}

          {section === 'editor' ? (
            <div className="studio-settings-section">
              <p className="studio-settings-note">{t('settingsDraftNote' as any)}</p>

              <SettingsGroupLabel>{t('settingsNavEditor')}</SettingsGroupLabel>
              <SettingsGroup>
                <SettingsToggleRow
                  title={t('settingsEditorSnapToGrid' as any)}
                  checked={editorSettings.snapToGrid}
                  onChange={(checked) => setEditor('snapToGrid', checked)}
                />
                <SettingsToggleRow
                  title={t('settingsEditorShowWaveforms' as any)}
                  checked={editorSettings.showWaveforms}
                  onChange={(checked) => setEditor('showWaveforms', checked)}
                />
                <SettingsToggleRow
                  title={t('settingsEditorRippleEdit' as any)}
                  checked={editorSettings.rippleEdit}
                  onChange={(checked) => setEditor('rippleEdit', checked)}
                />
              </SettingsGroup>

              <SettingsGroupLabel>{t('settingsEditorDefaultTool' as any)}</SettingsGroupLabel>
              <SettingsGroup>
                <SettingsPickerRow
                  label={t('settingsEditorToolSelect' as any)}
                  selected={editorSettings.defaultTool === 'select'}
                  onClick={() => setEditor('defaultTool', 'select')}
                />
                <SettingsPickerRow
                  label={t('settingsEditorToolPan' as any)}
                  selected={editorSettings.defaultTool === 'pan'}
                  onClick={() => setEditor('defaultTool', 'pan')}
                />
              </SettingsGroup>

              <SettingsGroupLabel>{t('settingsEditorTimeDisplay' as any)}</SettingsGroupLabel>
              <SettingsGroup>
                <SettingsPickerRow
                  label={t('settingsEditorTimecode' as any)}
                  selected={editorSettings.timeDisplay === 'timecode'}
                  onClick={() => setEditor('timeDisplay', 'timecode')}
                />
                <SettingsPickerRow
                  label={t('settingsEditorSeconds' as any)}
                  selected={editorSettings.timeDisplay === 'seconds'}
                  onClick={() => setEditor('timeDisplay', 'seconds')}
                />
              </SettingsGroup>
            </div>
          ) : null}

          {section === 'projects' ? (
            <div className="studio-settings-section">
              <p className="studio-settings-note">{t('settingsDraftNote' as any)}</p>

              <SettingsGroupLabel>{t('settingsProjectsDefaultRatio' as any)}</SettingsGroupLabel>
              <SettingsGroup>
                <SettingsPickerRow
                  label={t('settingsProjectsRatio169' as any)}
                  selected={projectSettings.defaultRatio === '16:9'}
                  onClick={() => setProject('defaultRatio', '16:9')}
                />
                <SettingsPickerRow
                  label={t('settingsProjectsRatio916' as any)}
                  selected={projectSettings.defaultRatio === '9:16'}
                  onClick={() => setProject('defaultRatio', '9:16')}
                />
                <SettingsPickerRow
                  label={t('settingsProjectsRatio11' as any)}
                  selected={projectSettings.defaultRatio === '1:1'}
                  onClick={() => setProject('defaultRatio', '1:1')}
                />
              </SettingsGroup>

              <SettingsGroupLabel>{t('settingsNavProjects')}</SettingsGroupLabel>
              <SettingsGroup>
                <SettingsToggleRow
                  title={t('settingsProjectsAutoSave' as any)}
                  checked={projectSettings.autoSave}
                  onChange={(checked) => setProject('autoSave', checked)}
                />
                <SettingsValueRow label={t('settingsProjectsAutoSaveInterval' as any)}>
                  <Select
                    className="studio-settings-inline-select"
                    size="small"
                    variant="borderless"
                    {...SETTINGS_SELECT_POPUP}
                    value={projectSettings.autoSaveInterval}
                    disabled={!projectSettings.autoSave}
                    onChange={(value) =>
                      setProject('autoSaveInterval', value as ProjectDraftSettings['autoSaveInterval'])
                    }
                    options={[
                      { value: '30s', label: intervalLabels['30s'] },
                      { value: '1m', label: intervalLabels['1m'] },
                      { value: '5m', label: intervalLabels['5m'] },
                    ]}
                    popupMatchSelectWidth={false}
                  />
                </SettingsValueRow>
                <SettingsToggleRow
                  title={t('settingsProjectsOpenLast' as any)}
                  checked={projectSettings.openLastProject}
                  onChange={(checked) => setProject('openLastProject', checked)}
                />
                <SettingsToggleRow
                  title={t('settingsProjectsConfirmClose' as any)}
                  checked={projectSettings.confirmBeforeClose}
                  onChange={(checked) => setProject('confirmBeforeClose', checked)}
                />
              </SettingsGroup>
            </div>
          ) : null}
        </div>
      </div>
    </VokopModal>
  );
}
