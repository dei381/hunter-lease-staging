import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { auth } from '../firebase';

interface AcceptLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  onSuccess: () => void;
}

export const AcceptLeadModal: React.FC<AcceptLeadModalProps> = ({ isOpen, onClose, leadId, onSuccess }) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [vin, setVin] = useState('');
  const [agreed, setAgreed] = useState(false);

  const handleAccept = async () => {
    if (!agreed || !vin) return;
    
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/dealer/leads/${leadId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ vin })
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        console.error('Failed to accept lead');
      }
    } catch (error) {
      console.error('Error accepting lead:', error);
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
          className="bg-[var(--bg)] w-full max-w-lg rounded-3xl border border-[var(--b2)] overflow-hidden shadow-2xl relative"
        >
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-[var(--mu2)] hover:text-white transition-colors z-10"
          >
            <X size={24} />
          </button>

          <div className="p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-[var(--lime)]/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-[var(--lime)]/20">
                <ShieldCheck className="w-8 h-8 text-[var(--lime)]" />
              </div>
              <h2 className="text-2xl font-display mb-2">Accept Deal</h2>
              <p className="text-[var(--mu2)] text-sm">
                Confirm vehicle availability and platform rules to proceed.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[var(--mu2)] mb-2">
                  Vehicle VIN <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={vin}
                  onChange={(e) => setVin(e.target.value.toUpperCase())}
                  className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--lime)] transition-colors font-mono uppercase"
                  placeholder="Enter 17-digit VIN"
                  maxLength={17}
                />
                <p className="text-[10px] text-[var(--mu2)] mt-2">
                  You must provide the exact VIN for the vehicle you are reserving for this client.
                </p>
              </div>

              <div className="bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <div className="mt-1">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="w-5 h-5 rounded border-[var(--b2)] bg-[var(--s2)] text-[var(--lime)] focus:ring-[var(--lime)] focus:ring-offset-0"
                    />
                  </div>
                  <div className="text-sm text-[var(--mu)]">
                    <span className="font-bold text-white block mb-1">Service Level Agreement</span>
                    I confirm that the vehicle (VIN: {vin || '___'}) is in stock. I agree to honor the approved financial terms and will not require the client to purchase any mandatory add-ons or F&I products. I understand that bait-and-switch tactics will result in a penalty and potential removal from the platform.
                  </div>
                </label>
              </div>

              <button
                onClick={handleAccept}
                disabled={loading || !agreed || vin.length !== 17}
                className="w-full bg-[var(--lime)] text-black font-bold uppercase tracking-widest py-4 rounded-xl hover:bg-[var(--lime2)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 size={20} />
                    Accept & Reveal Contact
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
