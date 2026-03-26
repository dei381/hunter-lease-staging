import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface CreditConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  onSuccess: () => void;
}

export const CreditConsentModal: React.FC<CreditConsentModalProps> = ({ isOpen, onClose, leadId, onSuccess }) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    dob: '',
    ssnLast4: ''
  });
  const [consent, setConsent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/700credit/soft-pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-uid': user?.uid || ''
        },
        body: JSON.stringify({
          leadId,
          ...formData
        })
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        console.error('Soft pull failed');
      }
    } catch (error) {
      console.error('Error during soft pull:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[var(--bg)] w-full max-w-2xl rounded-3xl border border-[var(--b2)] overflow-hidden shadow-2xl relative"
        >
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-[var(--mu2)] hover:text-white transition-colors z-10"
          >
            <X size={24} />
          </button>

          <div className="p-8 md:p-12">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-[var(--s1)] rounded-2xl flex items-center justify-center mx-auto mb-6 border border-[var(--b2)]">
                <ShieldCheck className="w-8 h-8 text-[var(--lime)]" />
              </div>
              <h2 className="text-3xl font-display mb-4">Prequalify Without Impact</h2>
              <p className="text-[var(--mu2)]">
                We use a "soft pull" to check your credit profile. This will <strong>not</strong> affect your credit score.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[var(--mu2)] mb-2">First Name</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--lime)] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[var(--mu2)] mb-2">Last Name</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--lime)] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[var(--mu2)] mb-2">Street Address</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--lime)] transition-colors"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-bold uppercase tracking-widest text-[var(--mu2)] mb-2">City</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--lime)] transition-colors"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold uppercase tracking-widest text-[var(--mu2)] mb-2">State</label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                    className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--lime)] transition-colors uppercase"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold uppercase tracking-widest text-[var(--mu2)] mb-2">ZIP</label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    value={formData.zip}
                    onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                    className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--lime)] transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[var(--mu2)] mb-2">Date of Birth</label>
                  <input
                    type="date"
                    required
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--lime)] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[var(--mu2)] mb-2">SSN (Last 4)</label>
                  <input
                    type="password"
                    required
                    maxLength={4}
                    placeholder="••••"
                    value={formData.ssnLast4}
                    onChange={(e) => setFormData({ ...formData, ssnLast4: e.target.value })}
                    className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--lime)] transition-colors text-center tracking-[0.5em]"
                  />
                </div>
              </div>

              <div className="bg-[var(--s1)] p-4 rounded-xl border border-[var(--b2)] mt-6">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-[var(--b2)] text-[var(--lime)] focus:ring-[var(--lime)] bg-[var(--bg)]"
                  />
                  <span className="text-xs text-[var(--mu2)] leading-relaxed">
                    I authorize this dealership and its affiliates to obtain a consumer credit report from a credit reporting agency to prequalify me for financing. I understand this is a "soft pull" and will not affect my credit score.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={!consent || loading}
                className="w-full bg-[var(--lime)] text-black font-bold uppercase tracking-widest py-4 rounded-xl hover:bg-[var(--lime2)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-8"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <FileText size={20} />
                    Prequalify Now
                  </>
                )}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
