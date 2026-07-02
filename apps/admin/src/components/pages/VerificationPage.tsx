import React, { useState } from 'react';
import { ShieldCheck, UserCheck, FileText, CheckCircle2, ShieldAlert, Award } from 'lucide-react';
import { Button } from '../atoms/Button';

export const VerificationPage: React.FC = () => {
  const [kycLevel, setKycLevel] = useState<'tier1' | 'tier2' | 'tier3'>('tier2');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleUpgrade = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitSuccess(true);
      setKycLevel('tier3');
    }, 1500);
  };

  return (
    <div className="space-y-6 flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-transparent">
      {/* Header Info */}
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4.5">
          <div className="w-14 h-14 rounded-2xl bg-[var(--indigo-dim)] text-[var(--indigo)] flex items-center justify-center flex-shrink-0 animate-pulse">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Merchant Trust & Verification</h3>
            <p className="text-xs text-[var(--text-dim)] leading-relaxed max-w-[500px]">
              Complete your Identity Verification (KYC) to raise daily payout limits, increase listings exposure, and unlock instant settlements.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white/4 border border-[var(--border)] rounded-xl px-4 py-2 flex-shrink-0 select-none">
          <Award className="w-4 h-4 text-yellow-500" />
          <span className="text-xs text-white font-bold uppercase">Tier 2 Verified</span>
        </div>
      </div>

      {/* Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Tier 1 */}
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5.5 shadow-sm flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-dim)] font-bold uppercase tracking-wider">Tier 1 • Basic</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-lg font-extrabold text-white">Email & Phone</h4>
              <p className="text-xs text-[var(--text-dim)] leading-relaxed">
                Basic requirements to browse the platform and purchase initial stock.
              </p>
            </div>
            <div className="h-[1px] bg-[var(--border)]" />
            <ul className="space-y-2.5 text-xs text-[var(--text-mid)] font-medium">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/80 flex-shrink-0" />
                <span>Email confirmation</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/80 flex-shrink-0" />
                <span>Phone SMS verification</span>
              </li>
              <li className="flex items-center gap-2 text-[var(--text-dim)] line-through">
                <span>Government issued ID</span>
              </li>
            </ul>
          </div>
          <div className="pt-2">
            <button disabled className="w-full h-10 rounded-xl bg-white/4 text-[var(--text-dim)] text-xs font-bold border border-white/4 cursor-not-allowed uppercase select-none">
              Fully Verified
            </button>
          </div>
        </div>

        {/* Tier 2 */}
        <div className="bg-[var(--panel)] border border-[var(--indigo)]/40 rounded-2xl p-5.5 shadow-md flex flex-col justify-between space-y-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-[var(--indigo)] text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl shadow-sm">
            Current Tier
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--indigo)] font-bold uppercase tracking-wider">Tier 2 • Merchant</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-lg font-extrabold text-white">Identity Proof</h4>
              <p className="text-xs text-[var(--text-dim)] leading-relaxed">
                Standard merchant level required to post listings, access sales analytics, and withdraw up to $5,000/day.
              </p>
            </div>
            <div className="h-[1px] bg-[var(--border)]" />
            <ul className="space-y-2.5 text-xs text-[var(--text-mid)] font-medium">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/80 flex-shrink-0" />
                <span>Government Passport / ID Scan</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/80 flex-shrink-0" />
                <span>Real-time Liveness check</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/80 flex-shrink-0" />
                <span>Basic home address proof</span>
              </li>
            </ul>
          </div>
          <div className="pt-2">
            <button disabled className="w-full h-10 rounded-xl bg-[var(--indigo)]/10 text-[var(--indigo)] text-xs font-bold border border-[var(--indigo)]/20 cursor-not-allowed uppercase select-none">
              Active Tier
            </button>
          </div>
        </div>

        {/* Tier 3 */}
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5.5 shadow-sm flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-dim)] font-bold uppercase tracking-wider">Tier 3 • Enterprise</span>
              {kycLevel === 'tier3' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-amber-500" />
              )}
            </div>
            <div className="space-y-1.5">
              <h4 className="text-lg font-extrabold text-white">Corporate Proof</h4>
              <p className="text-xs text-[var(--text-dim)] leading-relaxed">
                Unlocks unlimited payouts, custom billing API integrations, co-branding options, and dedicated account manager.
              </p>
            </div>
            <div className="h-[1px] bg-[var(--border)]" />
            <ul className="space-y-2.5 text-xs text-[var(--text-mid)] font-medium">
              <li className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-[var(--text-dim)] flex-shrink-0" />
                <span>Company Registration Document</span>
              </li>
              <li className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-[var(--text-dim)] flex-shrink-0" />
                <span>Tax ID Certificate (VAT/EIN)</span>
              </li>
              <li className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-[var(--text-dim)] flex-shrink-0" />
                <span>Ultimate Beneficial Owner (UBO) declaration</span>
              </li>
            </ul>
          </div>
          <div className="pt-2">
            {kycLevel === 'tier3' ? (
              <button disabled className="w-full h-10 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 cursor-not-allowed uppercase select-none">
                Applied / Approved
              </button>
            ) : (
              <Button
                onClick={handleUpgrade}
                disabled={isSubmitting}
                className="w-full h-10 uppercase text-xs font-bold"
              >
                {isSubmitting ? 'Submitting...' : 'Apply for Tier 3'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {submitSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-xl text-center select-none">
          🎉 Congratulations! Your Tier 3 Corporate Verification request has been submitted and auto-approved for testing!
        </div>
      )}
    </div>
  );
};
