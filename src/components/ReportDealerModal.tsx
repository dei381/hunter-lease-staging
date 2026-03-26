import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertOctagon } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface ReportDealerModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  onSuccess: () => void;
}

export const ReportDealerModal: React.FC<ReportDealerModalProps> = ({ isOpen, onClose, leadId, onSuccess }) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/complaint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-uid': user?.uid || ''
        },
        body: JSON.stringify({ reason })
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        console.error('Failed to submit complaint');
      }
    } catch (error) {
      console.error('Error submitting complaint:', error);
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
          className="bg-[var(--bg)] w-full max-w-lg rounded-3xl border border-red-500/30 overflow-hidden shadow-2xl relative"
        >
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-[var(--mu2)] hover:text-white transition-colors z-10"
          >
            <X size={24} />
          </button>

          <div className="p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                <AlertOctagon className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-display mb-2 text-red-500">Report Dealer</h2>
              <p className="text-[var(--mu2)] text-sm">
                Is the dealer trying to change your approved terms or force add-ons? Let us know, and we will protect your deposit.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[var(--mu2)] mb-2">
                  What happened? <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors min-h-[120px] resize-none"
                  placeholder="e.g., They are forcing me to buy a $1000 protection package..."
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || reason.trim().length < 10}
                className="w-full bg-red-500 text-white font-bold uppercase tracking-widest py-4 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  'Submit Complaint'
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
