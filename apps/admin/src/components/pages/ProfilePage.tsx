import React, { useState } from 'react';
import { Store, Camera, Save, Globe, Shield, RefreshCcw, CheckCircle2 } from 'lucide-react';
import { Button } from '../atoms/Button';

export const ProfilePage: React.FC = () => {
  const [shopName, setShopName] = useState('VOK2Z Key Shop');
  const [shopEmail, setShopEmail] = useState('support@vok2z.com');
  const [shopWebsite, setShopWebsite] = useState('https://vok2z.com');
  const [shopDesc, setShopDesc] = useState('The official trusted game key distributor. Delivery is instant and verified. Standard ABA and Crypto payouts accepted.');
  const [showSavedSuccess, setShowSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSavedSuccess(true);
    setTimeout(() => setShowSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-transparent">
      {/* Banner Cover profile card */}
      <div className="relative bg-[var(--panel)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
        <div className="h-32 bg-gradient-to-r from-[var(--indigo)] to-blue-600/30 relative select-none">
          {/* Subtle design element */}
          <div className="absolute inset-0 bg-black/15 flex items-end p-4">
            <span className="text-[10px] bg-white/10 text-white font-bold tracking-widest uppercase px-3 py-1 rounded-md backdrop-blur-sm border border-white/10">
              Verified Merchant Shopfront
            </span>
          </div>
        </div>

        {/* Profile elements overlay */}
        <div className="p-5 flex flex-col sm:flex-row items-center sm:items-end justify-between gap-5 mt-[-40px]">
          <div className="flex flex-col sm:flex-row items-center gap-4.5 text-center sm:text-left">
            <div className="relative w-20 h-20 rounded-2xl bg-[#09090e] border-2 border-[var(--border)] shadow-md flex items-center justify-center text-[var(--indigo)] select-none">
              <Store className="w-9 h-9" />
              <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-md bg-[var(--indigo)] hover:bg-[var(--indigo)]/90 text-white border border-[#09090e] flex items-center justify-center cursor-pointer shadow-sm">
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1 sm:mb-2 select-none">
              <h3 className="text-base font-extrabold text-white flex items-center gap-1.5 justify-center sm:justify-start">
                <span>{shopName}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" title="Online" />
              </h3>
              <p className="text-[11px] text-[var(--text-dim)] font-medium">Merchant ID: mch-8921840-v2</p>
            </div>
          </div>

          <div className="flex gap-2 sm:mb-2 select-none">
            <button className="h-8 rounded-lg bg-white/4 hover:bg-white/8 border border-[var(--border)] text-xs text-white px-3 font-semibold transition-all cursor-pointer flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              <span>Preview Live Shop</span>
            </button>
          </div>
        </div>
      </div>

      {showSavedSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-xl text-center select-none flex items-center justify-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Shop settings successfully saved & updated in public storefront directory.</span>
        </div>
      )}

      {/* Settings inputs */}
      <form onSubmit={handleSubmit} className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-5">
        <h4 className="text-sm font-bold text-white border-b border-[var(--border)] pb-3 select-none">Shop Configuration</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs text-[var(--text-mid)] font-semibold select-none">Storefront Name</label>
            <input
              type="text"
              required
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="w-full h-11 bg-white/4 border border-[var(--border)] rounded-xl px-4 text-xs text-[var(--text)] outline-none focus:border-[var(--indigo)] focus:ring-2 focus:ring-[var(--indigo)]/10 transition-all font-semibold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[var(--text-mid)] font-semibold select-none">Support Contact Email</label>
            <input
              type="email"
              required
              value={shopEmail}
              onChange={(e) => setShopEmail(e.target.value)}
              className="w-full h-11 bg-white/4 border border-[var(--border)] rounded-xl px-4 text-xs text-[var(--text)] outline-none focus:border-[var(--indigo)] focus:ring-2 focus:ring-[var(--indigo)]/10 transition-all font-semibold"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs text-[var(--text-mid)] font-semibold select-none">Official Website URL</label>
            <input
              type="url"
              value={shopWebsite}
              onChange={(e) => setShopWebsite(e.target.value)}
              className="w-full h-11 bg-white/4 border border-[var(--border)] rounded-xl px-4 text-xs text-[var(--text)] outline-none focus:border-[var(--indigo)] focus:ring-2 focus:ring-[var(--indigo)]/10 transition-all font-semibold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[var(--text-mid)] font-semibold select-none">Support Policy Protection</label>
            <div className="h-11 bg-white/4 border border-[var(--border)] rounded-xl px-4 flex items-center justify-between select-none">
              <span className="text-xs text-[var(--text-dim)] font-bold flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-400" /> 100% Buyer Guarantee Enabled
              </span>
              <span className="text-[9px] bg-emerald-500/15 text-emerald-400 font-bold uppercase px-2.5 py-0.5 rounded-full">
                Active
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-[var(--text-mid)] font-semibold select-none">Public Shop Description</label>
          <textarea
            rows={4}
            value={shopDesc}
            onChange={(e) => setShopDesc(e.target.value)}
            className="w-full bg-white/4 border border-[var(--border)] rounded-xl p-3.5 text-xs text-[var(--text)] outline-none focus:border-[var(--indigo)] focus:ring-2 focus:ring-[var(--indigo)]/10 transition-all placeholder-[var(--text-dim)] leading-relaxed resize-none font-semibold"
          />
        </div>

        <div className="flex justify-end pt-2 border-t border-[var(--border)] select-none">
          <Button type="submit" className="h-10 text-xs font-bold uppercase flex items-center gap-1.5 px-5">
            <Save className="w-3.5 h-3.5" />
            <span>Save Settings</span>
          </Button>
        </div>
      </form>
    </div>
  );
};
