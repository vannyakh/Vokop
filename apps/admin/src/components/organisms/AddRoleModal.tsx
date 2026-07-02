import React, { useState } from 'react';
import { X, Shield, PlusCircle, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Role } from '../../types';
import { Button } from '../atoms/Button';

interface AddRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (role: Role) => void;
}

export const AddRoleModal: React.FC<AddRoleModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'enabled' | 'disabled'>('enabled');
  const [remark, setRemark] = useState('');
  const [error, setError] = useState('');

  const generateRoleId = () => {
    // Generate a secure UUID-like random identifier
    const chars = 'abcdef0123456789';
    let segments = [];
    const lengths = [8, 4, 4, 4, 12];
    for (let len of lengths) {
      let segment = '';
      for (let i = 0; i < len; i++) {
        segment += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      segments.push(segment);
    }
    return segments.join('-');
  };

  const getFormattedDate = () => {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const min = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    return `${yyyy}/${mm}/${dd} ${hh}:${min}:${ss}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Role name is required.');
      return;
    }

    const newRole: Role = {
      id: generateRoleId(),
      name: name.trim(),
      status,
      remark: remark.trim() || 'No description provided.',
      created: getFormattedDate(),
    };

    onAdd(newRole);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setName('');
    setStatus('enabled');
    setRemark('');
    setError('');
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancel}
            className="absolute inset-0 bg-[#07070a]/80 backdrop-blur-sm"
          />

          {/* Modal Card Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
            className="relative w-full max-w-lg bg-[#0d0d14] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-[#0f0f17]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--indigo)]/10 border border-[var(--indigo)]/20 flex items-center justify-center text-[var(--indigo)]">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Create New Role</h3>
                  <p className="text-[11px] text-[var(--text-dim)]">Define a new authorization profile</p>
                </div>
              </div>
              <button
                onClick={handleCancel}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-dim)] hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Name Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[var(--text-mid)] uppercase tracking-wider select-none">
                  Role Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sales Coordinator"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (e.target.value.trim()) setError('');
                  }}
                  className={`w-full bg-white/3 border rounded-xl px-4 py-2.5 text-xs text-[var(--text)] placeholder-[var(--text-dim)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--indigo)]/20 transition-all ${
                    error ? 'border-red-500/50 focus:border-red-500' : 'border-[var(--border)] focus:border-[var(--indigo)]'
                  }`}
                  autoFocus
                />
                {error && (
                  <div className="flex items-center gap-1.5 text-[11px] text-red-400 font-medium pt-1 animate-in fade-in duration-200">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              {/* Status Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[var(--text-mid)] uppercase tracking-wider select-none">
                  Default Status
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setStatus('enabled')}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      status === 'enabled'
                        ? 'bg-[var(--indigo)]/10 border-[var(--indigo)]/50 text-white shadow-sm shadow-[var(--indigo)]/5'
                        : 'bg-white/2 border-[var(--border)] text-[var(--text-dim)] hover:border-white/10 hover:text-[var(--text-mid)]'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${status === 'enabled' ? 'bg-emerald-400' : 'bg-neutral-600'}`} />
                    Enabled
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('disabled')}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      status === 'disabled'
                        ? 'bg-orange-500/10 border-orange-500/30 text-white'
                        : 'bg-white/2 border-[var(--border)] text-[var(--text-dim)] hover:border-white/10 hover:text-[var(--text-mid)]'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${status === 'disabled' ? 'bg-orange-400' : 'bg-neutral-600'}`} />
                    Disabled
                  </button>
                </div>
              </div>

              {/* Remark Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[var(--text-mid)] uppercase tracking-wider select-none">
                  Remark / Description
                </label>
                <textarea
                  placeholder="Describe the responsibilities and permissions associated with this role..."
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  rows={3}
                  className="w-full bg-white/3 border border-[var(--border)] focus:border-[var(--indigo)] rounded-xl px-4 py-2.5 text-xs text-[var(--text)] placeholder-[var(--text-dim)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--indigo)]/20 transition-all resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  className="h-10 text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="h-10 text-xs font-bold shadow-lg shadow-[var(--indigo)]/10"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Create Role
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
