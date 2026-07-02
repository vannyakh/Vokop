import React, { useState } from 'react';
import { AlertTriangle, Send, Gavel, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { Button } from '../atoms/Button';

interface Dispute {
  id: string;
  orderId: string;
  buyer: string;
  item: string;
  amount: number;
  reason: string;
  status: 'awaiting_merchant' | 'awaiting_buyer' | 'resolved_refunded' | 'resolved_closed';
  messages: { sender: 'buyer' | 'merchant' | 'system'; text: string; date: string }[];
}

const initialDisputes: Dispute[] = [
  {
    id: 'DISP-4921',
    orderId: 'ORD-982194',
    buyer: 'alex_gamer99',
    item: 'Elden Ring - Steam Key',
    amount: 59.99,
    reason: 'Duplicate/Already Redeemed license key',
    status: 'awaiting_merchant',
    messages: [
      { sender: 'buyer', text: 'Hey, I copy-pasted the Elden Ring steam code in the client but Steam is saying "Duplicate Code". The key was already activated by somebody else. Please send a new code or refund me.', date: '2026-06-30 18:22' },
      { sender: 'system', text: 'System automatic health check: Game key delivered by merchant had been logged in db as fresh batch key #381A.', date: '2026-06-30 18:23' }
    ]
  },
  {
    id: 'DISP-3810',
    orderId: 'ORD-298311',
    buyer: 'natasha_b',
    item: 'Hades II - Steam Key',
    amount: 29.99,
    reason: 'Incorrect region restriction',
    status: 'awaiting_buyer',
    messages: [
      { sender: 'buyer', text: 'I bought this thinking it was global but it is restricted to EU accounts. I live in North America and cannot activate it.', date: '2026-06-25 10:14' },
      { sender: 'merchant', text: 'Hi Natasha! We reviewed your IP region. It seems you used a VPN during purchase. However, we can exchange this for a US key if you send us a screenshot of the region error.', date: '2026-06-26 14:02' }
    ]
  },
  {
    id: 'DISP-1122',
    orderId: 'ORD-021029',
    buyer: 'karl_marx',
    item: 'Hollow Knight: Silksong',
    amount: 19.99,
    reason: 'Buyer accidental duplicate purchase',
    status: 'resolved_refunded',
    messages: [
      { sender: 'buyer', text: 'Whoops! I bought this twice by accident. I have not opened either of the keys yet, please refund one of them.', date: '2026-06-20 08:33' },
      { sender: 'merchant', text: 'No problem Karl. Refund issued for the second key! Hope you enjoy the game.', date: '2026-06-20 11:20' },
      { sender: 'system', text: 'Dispute closed: Full refund of $19.99 successfully returned to buyer.', date: '2026-06-20 11:21' }
    ]
  }
];

export const DisputesPage: React.FC = () => {
  const [disputes, setDisputes] = useState<Dispute[]>(initialDisputes);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(initialDisputes[0]);
  const [replyText, setReplyText] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispute || !replyText.trim()) return;

    const newMessage = {
      sender: 'merchant' as const,
      text: replyText,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    const updatedDisputes = disputes.map(d => {
      if (d.id === selectedDispute.id) {
        return {
          ...d,
          status: 'awaiting_buyer' as const,
          messages: [...d.messages, newMessage]
        };
      }
      return d;
    });

    setDisputes(updatedDisputes);
    const refreshed = updatedDisputes.find(d => d.id === selectedDispute.id);
    if (refreshed) {
      setSelectedDispute(refreshed);
    }
    setReplyText('');
    setSuccessMsg('Response sent successfully. Status updated to: Awaiting Buyer');
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleResolve = (action: 'refund' | 'close') => {
    if (!selectedDispute) return;

    const status = action === 'refund' ? ('resolved_refunded' as const) : ('resolved_closed' as const);
    const systemText = action === 'refund'
      ? `Dispute closed: Full refund of $${selectedDispute.amount} successfully returned to buyer.`
      : `Dispute closed: Resolved by Merchant as Closed/Declined.`;

    const systemMessage = {
      sender: 'system' as const,
      text: systemText,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    const updatedDisputes = disputes.map(d => {
      if (d.id === selectedDispute.id) {
        return {
          ...d,
          status,
          messages: [...d.messages, systemMessage]
        };
      }
      return d;
    });

    setDisputes(updatedDisputes);
    const refreshed = updatedDisputes.find(d => d.id === selectedDispute.id);
    if (refreshed) {
      setSelectedDispute(refreshed);
    }
    setSuccessMsg(action === 'refund' ? 'Full refund processed successfully.' : 'Dispute closed/declined.');
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 min-h-0 overflow-hidden h-full">
      {/* List (Left 1/3) */}
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4.5 shadow-sm space-y-4 flex flex-col min-h-0 h-full overflow-hidden">
        <div className="flex-shrink-0 flex items-center justify-between border-b border-[var(--border)] pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.8 select-none">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Open Disputes</span>
          </h3>
          <span className="text-[10px] bg-red-500/10 border border-red-500/20 text-red-400 font-bold px-2 py-0.5 rounded-full select-none">
            {disputes.filter(d => d.status === 'awaiting_merchant').length} Urgent
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
          {disputes.map(disp => (
            <div
              key={disp.id}
              onClick={() => setSelectedDispute(disp)}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-150 select-none ${
                selectedDispute?.id === disp.id
                  ? 'bg-[var(--indigo)]/10 border-[var(--indigo)]/50'
                  : 'bg-white/2 border-transparent hover:bg-white/5 hover:border-[var(--border)]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-[var(--text-dim)] font-bold">{disp.id}</span>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                  disp.status === 'awaiting_merchant'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : disp.status === 'awaiting_buyer'
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {disp.status.replace('_', ' ')}
                </span>
              </div>
              <div className="text-xs font-bold text-white truncate">{disp.item}</div>
              <div className="text-[10px] text-[var(--text-dim)] mt-1 truncate">Buyer: {disp.buyer} • ${disp.amount}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat & Actions (Right 2/3) */}
      <div className="lg:col-span-2 bg-[var(--panel)] border border-[var(--border)] rounded-2xl shadow-sm flex flex-col min-h-0 h-full overflow-hidden">
        {selectedDispute ? (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-[var(--border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-shrink-0 bg-black/10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[var(--text-dim)] font-black">{selectedDispute.id}</span>
                  <span className="text-[10px] text-[var(--text-dim)]">•</span>
                  <span className="text-xs font-bold text-white">{selectedDispute.buyer}</span>
                </div>
                <h4 className="text-sm font-bold text-white mt-1">{selectedDispute.item}</h4>
              </div>

              {selectedDispute.status.startsWith('awaiting') && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleResolve('refund')}
                    className="h-8 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white hover:border-transparent text-xs text-red-400 px-3 font-semibold transition-all duration-150 cursor-pointer"
                  >
                    Issue Refund
                  </button>
                  <button
                    onClick={() => handleResolve('close')}
                    className="h-8 rounded-lg bg-white/4 border border-[var(--border)] hover:bg-white/8 text-xs text-white px-3 font-semibold transition-all duration-150 cursor-pointer"
                  >
                    Close Dispute
                  </button>
                </div>
              )}
            </div>

            {/* Chat message content */}
            <div className="flex-1 overflow-y-auto p-4.5 space-y-4 scrollbar-thin">
              {successMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-xl text-center select-none animate-in fade-in">
                  {successMsg}
                </div>
              )}

              <div className="bg-white/2 border border-[var(--border)] rounded-xl p-3.5 space-y-1">
                <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest select-none">Dispute Claim Reason</div>
                <p className="text-xs text-[var(--text-mid)] font-semibold leading-relaxed">{selectedDispute.reason}</p>
                <div className="text-[10px] text-[var(--text-dim)] pt-1 font-bold">Total Disputed: ${selectedDispute.amount} USD</div>
              </div>

              <div className="h-[1px] bg-[var(--border)] my-2" />

              {/* Messages timeline */}
              {selectedDispute.messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col max-w-[80%] ${
                    m.sender === 'merchant' ? 'ml-auto items-end' : m.sender === 'system' ? 'mx-auto w-full max-w-full' : 'items-start'
                  }`}
                >
                  {m.sender === 'system' ? (
                    <div className="w-full text-center py-2 px-4 bg-black/20 border border-white/5 rounded-xl text-[10px] font-mono text-[var(--text-dim)] font-semibold flex items-center justify-center gap-1.5 select-none">
                      <Gavel className="w-3.5 h-3.5 text-[var(--indigo)]" />
                      <span>{m.text}</span>
                    </div>
                  ) : (
                    <>
                      <div className="text-[9px] text-[var(--text-dim)] font-bold mb-1 select-none">
                        {m.sender === 'merchant' ? 'You (Merchant)' : selectedDispute.buyer} • {m.date}
                      </div>
                      <div className={`p-3 rounded-2xl text-xs font-semibold leading-relaxed ${
                        m.sender === 'merchant'
                          ? 'bg-[var(--indigo)] text-white rounded-tr-none'
                          : 'bg-white/5 text-[var(--text)] border border-[var(--border)] rounded-tl-none'
                      }`}>
                        {m.text}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Input Footer */}
            {selectedDispute.status.startsWith('awaiting') ? (
              <form onSubmit={handleSendMessage} className="p-4 border-t border-[var(--border)] bg-black/10 flex items-center gap-3 flex-shrink-0">
                <input
                  type="text"
                  required
                  placeholder="Type message to buyer explaining solution..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 bg-white/4 border border-[var(--border)] rounded-xl px-4.5 h-11 text-xs text-[var(--text)] outline-none focus:border-[var(--indigo)] focus:ring-2 focus:ring-[var(--indigo)]/10 transition-all font-semibold"
                />
                <button
                  type="submit"
                  className="w-11 h-11 bg-[var(--indigo)] hover:bg-[var(--indigo)]/90 text-white rounded-xl flex items-center justify-center cursor-pointer transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <div className="p-5 border-t border-[var(--border)] bg-emerald-500/5 text-center flex items-center justify-center gap-2 select-none flex-shrink-0">
                <ShieldCheck className="w-4.5 h-4.5 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">This dispute has been fully resolved and archived</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
            <XCircle className="w-10 h-10 text-[var(--text-dim)] mb-3" />
            <div className="text-sm font-bold text-white">No dispute selected</div>
            <p className="text-xs text-[var(--text-dim)] mt-1.5 max-w-[200px] leading-relaxed">
              Choose a claim ticket on the left menu to view logs and negotiate.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
