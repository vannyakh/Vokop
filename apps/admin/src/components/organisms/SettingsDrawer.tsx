import React from 'react';
import { X, Settings as SettingsIcon, User, Bell, ShieldCheck, Key, CreditCard } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { ThemeSwitcher } from '../molecules/ThemeSwitcher';
import { ToggleSwitch } from '../molecules/ToggleSwitch';
import { Button } from '../atoms/Button';
import { Select } from 'antd';

interface SettingsDrawerProps {
  id?: string;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ id }) => {
  const {
    settings,
    updateSettings,
    isOpen,
    setIsOpen,
    activePanel,
    setActivePanel,
  } = useSettings();

  if (!isOpen) return null;

  const navItems = [
    { id: 'general', label: 'General', icon: <SettingsIcon className="w-3.75 h-3.75" /> },
    { id: 'account', label: 'Account', icon: <User className="w-3.75 h-3.75" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-3.75 h-3.75" /> },
    { id: 'security', label: 'Security', icon: <ShieldCheck className="w-3.75 h-3.75" /> },
    { id: 'api', label: 'API Keys', icon: <Key className="w-3.75 h-3.75" /> },
    { id: 'billing', label: 'Billing', icon: <CreditCard className="w-3.75 h-3.75" /> },
  ];

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSave = () => {
    alert('Settings successfully updated and saved locally!');
    setIsOpen(false);
  };

  return (
    <div
      id={id}
      className="fixed inset-0 bg-black/60 backdrop-blur-[3px] flex items-center justify-center p-6 z-[200]"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        role="dialog"
        aria-label="Settings panel"
        className="w-[720px] max-w-full h-[560px] bg-[var(--panel-solid)] border border-[var(--border)] rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden transition-all duration-300"
      >
        {/* Drawer Header */}
        <div className="h-14.5 px-[22px] border-b border-[var(--border)] flex items-center justify-between flex-shrink-0">
          <div>
            <div className="text-sm font-bold text-[var(--text)]">Settings</div>
            <div className="text-[11.5px] text-[var(--text-dim)] mt-0.5 select-none">
              Manage your seller account preferences
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-7.5 h-7.5 rounded-full border border-[var(--border)] bg-[var(--panel-solid-even)] hover:bg-[var(--panel-solid-hover)] text-[var(--text-mid)] hover:text-[var(--text)] hover:border-[var(--indigo)] hover:border-opacity-50 flex items-center justify-center cursor-pointer transition-colors duration-150"
          >
            <X className="w-3.25 h-3.25" strokeWidth={2.5} />
          </button>
        </div>

        {/* Drawer Body layout */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Side Tabs Navigation */}
          <div className="w-[208px] border-r border-[var(--border)] p-3 bg-[var(--panel-solid-even)] overflow-y-auto space-y-1.5 select-none">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActivePanel(item.id)}
                className={`w-full h-11 flex items-center gap-3 px-3.5 rounded-xl text-left text-[13.5px] font-semibold cursor-pointer transition-all duration-150 ${
                  activePanel === item.id
                    ? 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)] shadow-sm ring-1 ring-[var(--indigo)]/10'
                    : 'text-[var(--text-mid)] hover:bg-[var(--panel-solid-hover)] hover:text-[var(--text)]'
                }`}
              >
                <span className={`transition-transform duration-150 ${activePanel === item.id ? 'text-[var(--sidebar-active-text)] scale-110' : 'text-[var(--text-dim)]'}`}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
          </div>

          {/* Configuration Panels */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-none">
            {/* 1. GENERAL PANEL */}
            {activePanel === 'general' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-[13.5px] font-bold text-[var(--text)] mb-1">Appearance &amp; Animation</h4>
                  <p className="text-xs text-[var(--text-dim)] mb-3 leading-relaxed">
                    Choose how the dashboard looks and animates for you.
                  </p>
                  <div className="flex items-center justify-between py-3 border-b border-[var(--border)] border-dashed">
                    <div>
                      <div className="text-xs font-semibold text-[var(--text)]">Theme mode</div>
                      <div className="text-[11px] text-[var(--text-dim)] mt-0.5">
                        Applies across all panels and modals
                      </div>
                    </div>
                    <ThemeSwitcher
                      currentTheme={settings.theme}
                      onThemeChange={(newTheme) => updateSettings({ theme: newTheme })}
                    />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-[var(--border)] border-dashed">
                    <div>
                      <div className="text-xs font-semibold text-[var(--text)]">Page Transitions</div>
                      <div className="text-[11px] text-[var(--text-dim)] mt-0.5">
                        Animate view switches with liquid glass transitions
                      </div>
                    </div>
                    <ToggleSwitch
                      checked={settings.transitionEnabled}
                      onChange={(checked) => updateSettings({ transitionEnabled: checked })}
                    />
                  </div>

                  {settings.transitionEnabled && (
                    <div className="grid grid-cols-2 gap-4 py-3 border-b border-[var(--border)] border-dashed animate-in fade-in-50 duration-200">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-[var(--text-mid)] font-semibold select-none">Transition Style</label>
                        <Select
                          value={settings.transitionType}
                          onChange={(val) => updateSettings({ transitionType: val as any })}
                          size="middle"
                          className="w-full font-semibold"
                          options={[
                            { value: 'fade-blur', label: 'Blur Fade (Premium)' },
                            { value: 'slide', label: 'Slide Up / Enter' },
                            { value: 'fade', label: 'Simple Crossfade' },
                            { value: 'zoom', label: 'Liquid Zoom Scale' },
                          ]}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-[var(--text-mid)] font-semibold select-none">Animation Speed</label>
                        <Select
                          value={settings.transitionSpeed}
                          onChange={(val) => updateSettings({ transitionSpeed: val as any })}
                          size="middle"
                          className="w-full font-semibold"
                          options={[
                            { value: 'fast', label: 'Fast (0.15s)' },
                            { value: 'normal', label: 'Normal (0.28s)' },
                            { value: 'slow', label: 'Slow (0.50s)' },
                          ]}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-[13.5px] font-bold text-[var(--text)] mb-1">Store details</h4>
                  <p className="text-xs text-[var(--text-dim)] mb-3 leading-relaxed">
                    Basic info shown on your public storefront.
                  </p>
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between py-2.5 border-b border-[var(--border)] last:border-b-0">
                      <div>
                        <div className="text-xs font-semibold text-[var(--text)]">Store name</div>
                        <div className="text-[11px] text-[var(--text-dim)] mt-0.5">
                          Shown to buyers across the marketplace
                        </div>
                      </div>
                      <input
                        type="text"
                        value={settings.storeName}
                        onChange={(e) => updateSettings({ storeName: e.target.value })}
                        className="h-11 bg-[var(--panel-solid-even)] border border-[var(--border)] rounded-xl px-4 text-sm text-[var(--text)] outline-none focus:border-[var(--indigo)] focus:ring-2 focus:ring-[var(--indigo)]/20 focus:bg-[var(--panel-solid-hover)] w-[240px] transition-all duration-150 shadow-inner"
                      />
                    </div>

                    <div className="flex items-center justify-between py-2.5 border-b border-[var(--border)] last:border-b-0">
                      <div>
                        <div className="text-xs font-semibold text-[var(--text)]">Default currency</div>
                        <div className="text-[11px] text-[var(--text-dim)] mt-0.5">
                          Used for listing prices and payouts
                        </div>
                      </div>
                      <input
                        type="text"
                        value={settings.currency}
                        onChange={(e) => updateSettings({ currency: e.target.value })}
                        className="h-11 bg-[var(--panel-solid-even)] border border-[var(--border)] rounded-xl px-4 text-sm text-[var(--text)] outline-none focus:border-[var(--indigo)] focus:ring-2 focus:ring-[var(--indigo)]/20 focus:bg-[var(--panel-solid-hover)] w-[240px] transition-all duration-150 shadow-inner"
                      />
                    </div>

                    <div className="flex items-center justify-between py-2.5 border-b border-[var(--border)] last:border-b-0">
                      <div>
                        <div className="text-xs font-semibold text-[var(--text)]">Time zone</div>
                        <div className="text-[11px] text-[var(--text-dim)] mt-0.5">
                          Applies to order timestamps and reports
                        </div>
                      </div>
                      <input
                        type="text"
                        value={settings.timeZone}
                        onChange={(e) => updateSettings({ timeZone: e.target.value })}
                        className="h-11 bg-[var(--panel-solid-even)] border border-[var(--border)] rounded-xl px-4 text-sm text-[var(--text)] outline-none focus:border-[var(--indigo)] focus:ring-2 focus:ring-[var(--indigo)]/20 focus:bg-[var(--panel-solid-hover)] w-[240px] transition-all duration-150 shadow-inner"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-[13.5px] font-bold text-[var(--text)] mb-3">Storefront behavior</h4>
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between py-2.5">
                      <div>
                        <div className="text-xs font-semibold text-[var(--text)]">
                          Show out-of-stock listings
                        </div>
                        <div className="text-[11px] text-[var(--text-dim)] mt-0.5">
                          Buyers can still see them, greyed out
                        </div>
                      </div>
                      <ToggleSwitch
                        checked={settings.showOutOfStock}
                        onChange={(checked) => updateSettings({ showOutOfStock: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between py-2.5 border-t border-[var(--border)]">
                      <div>
                        <div className="text-xs font-semibold text-[var(--text)]">
                          Auto-accept reorders
                        </div>
                        <div className="text-[11px] text-[var(--text-dim)] mt-0.5">
                          Skip manual review for repeat buyers
                        </div>
                      </div>
                      <ToggleSwitch
                        checked={settings.autoAcceptReorders}
                        onChange={(checked) => updateSettings({ autoAcceptReorders: checked })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. ACCOUNT PANEL */}
            {activePanel === 'account' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-[13.5px] font-bold text-[var(--text)] mb-1">Profile</h4>
                  <p className="text-xs text-[var(--text-dim)] mb-4 leading-relaxed">
                    Personalized display properties for the session.
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2 border-b border-[var(--border)]">
                      <div className="text-xs font-semibold text-[var(--text)]">Display name</div>
                      <input
                        type="text"
                        defaultValue="Luki"
                        className="h-11 bg-[var(--panel-solid-even)] border border-[var(--border)] rounded-xl px-4 text-sm text-[var(--text)] outline-none focus:border-[var(--indigo)] focus:ring-2 focus:ring-[var(--indigo)]/20 focus:bg-[var(--panel-solid-hover)] w-[240px] transition-all duration-150 shadow-inner"
                      />
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <div className="text-xs font-semibold text-[var(--text)]">Email address</div>
                      <input
                        type="text"
                        defaultValue="luki@vok2z.com"
                        className="h-11 bg-[var(--panel-solid-even)] border border-[var(--border)] rounded-xl px-4 text-sm text-[var(--text)] outline-none focus:border-[var(--indigo)] focus:ring-2 focus:ring-[var(--indigo)]/20 focus:bg-[var(--panel-solid-hover)] w-[240px] transition-all duration-150 shadow-inner"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. NOTIFICATIONS PANEL */}
            {activePanel === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-[13.5px] font-bold text-[var(--text)] mb-3">Email notifications</h4>
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between py-2.5">
                      <div>
                        <div className="text-xs font-semibold text-[var(--text)]">New orders</div>
                        <div className="text-[11px] text-[var(--text-dim)] mt-0.5">
                          Notify me immediately on customer purchase
                        </div>
                      </div>
                      <ToggleSwitch
                        checked={settings.notifyNewOrders}
                        onChange={(checked) => updateSettings({ notifyNewOrders: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between py-2.5 border-t border-[var(--border)]">
                      <div>
                        <div className="text-xs font-semibold text-[var(--text)]">Disputes opened</div>
                        <div className="text-[11px] text-[var(--text-dim)] mt-0.5">
                          Alert when buyers open item disputes
                        </div>
                      </div>
                      <ToggleSwitch
                        checked={settings.notifyDisputes}
                        onChange={(checked) => updateSettings({ notifyDisputes: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between py-2.5 border-t border-[var(--border)]">
                      <div>
                        <div className="text-xs font-semibold text-[var(--text)]">Payout processed</div>
                        <div className="text-[11px] text-[var(--text-dim)] mt-0.5">
                          Alert when wallet payouts are transferred
                        </div>
                      </div>
                      <ToggleSwitch
                        checked={settings.notifyPayouts}
                        onChange={(checked) => updateSettings({ notifyPayouts: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between py-2.5 border-t border-[var(--border)]">
                      <div>
                        <div className="text-xs font-semibold text-[var(--text)]">Marketing tips</div>
                        <div className="text-[11px] text-[var(--text-dim)] mt-0.5">
                          Occasional growth advice and updates
                        </div>
                      </div>
                      <ToggleSwitch
                        checked={settings.notifyMarketing}
                        onChange={(checked) => updateSettings({ notifyMarketing: checked })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. SECURITY PANEL */}
            {activePanel === 'security' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-[13.5px] font-bold text-[var(--text)] mb-3">Login &amp; access</h4>
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between py-2.5">
                      <div>
                        <div className="text-xs font-semibold text-[var(--text)]">
                          Two-factor authentication
                        </div>
                        <div className="text-[11px] text-[var(--text-dim)] mt-0.5">
                          Required for requesting payout withdrawals
                        </div>
                      </div>
                      <ToggleSwitch
                        checked={settings.twoFactorAuth}
                        onChange={(checked) => updateSettings({ twoFactorAuth: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between py-2.5 border-t border-[var(--border)] text-xs">
                      <div>
                        <div className="font-semibold text-[var(--text)]">Active sessions</div>
                        <div className="text-[11px] text-[var(--text-dim)] mt-0.5">
                          Devices currently logged in
                        </div>
                      </div>
                      <span className="text-[var(--text-dim)] font-semibold select-none">3 devices</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. API PANEL */}
            {activePanel === 'api' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-[13.5px] font-bold text-[var(--text)] mb-1">API Access</h4>
                  <p className="text-xs text-[var(--text-dim)] mb-4 leading-relaxed">
                    Used for automated stock feeds and auto-delivery connections.
                  </p>
                  <div className="flex items-center justify-between py-3 border border-[var(--border)] bg-[var(--panel-solid-even)] p-4 rounded-xl">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[var(--text)]">Live API key</div>
                      <div className="text-[11px] text-[var(--text-dim)] mt-0.5 font-mono truncate">
                        sk_live_••••••••••••3f2a
                      </div>
                    </div>
                    <Button size="sm" onClick={() => alert('API credentials successfully regenerated!')}>
                      Regenerate
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* 6. BILLING PANEL */}
            {activePanel === 'billing' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-[13.5px] font-bold text-[var(--text)] mb-1">Payout method</h4>
                  <p className="text-xs text-[var(--text-dim)] mb-4 leading-relaxed">
                    Your financial withdrawal bank destination.
                  </p>
                  <div className="flex items-center justify-between py-3 border border-[var(--border)] bg-[var(--panel-solid-even)] p-4 rounded-xl">
                    <div>
                      <div className="text-xs font-semibold text-[var(--text)]">ABA Bank ••••2231</div>
                      <div className="text-[11px] text-[var(--text-dim)] mt-0.5">
                        Default payout target account
                      </div>
                    </div>
                    <Button size="sm" onClick={() => alert('Change default payout ABA account flow...')}>
                      Change
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="h-14.5 px-[22px] border-t border-[var(--border)] bg-[var(--panel-solid-even)] flex items-center justify-end gap-2.5 flex-shrink-0 select-none">
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
};
