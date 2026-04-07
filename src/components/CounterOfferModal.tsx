import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MessageSquare, DollarSign, Car } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { auth } from '../firebase';

interface CounterOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  onSuccess: () => void;
}

export const CounterOfferModal: React.FC<CounterOfferModalProps> = ({ isOpen, onClose, leadId, onSuccess }) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    payment: '',
    down: '',
    alternative: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/dealer/leads/${leadId}/counter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          payment: parseInt(formData.payment) || null,
          down: parseInt(formData.down) || null,
          alternative: formData.alternative,
          message: formData.message
        })
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        console.error('Counter offer failed');
      }
    } catch (error) {
      console.error('Error submitting counter offer:', error);
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
              <div className="w-16 h-16 bg-[var(--s1)] rounded-2xl flex items-center justify-center mx-auto mb-6 border border-[var(--b2)]">
                <MessageSquare className="w-8 h-8 text-[var(--lime)]" />
              </div>
              <h2 className="text-2xl font-display mb-2">Send Counter Offer</h2>
              <p className="text-[var(--mu2)] text-sm">
                Propose different terms or an alternative vehicle.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[var(--mu2)] mb-2">New Payment ($/mo)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--mu2)]" />
                    <input
                      type="number"
                      value={formData.payment}
                      onChange={(e) => setFormData({ ...formData, payment: e.target.value })}
                      className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-[var(--lime)] transition-colors"
                      placeholder="e.g. 450"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[var(--mu2)] mb-2">New Down ($)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--mu2)]" />
                    <input
                      type="number"
                      value={formData.down}
                      onChange={(e) => setFormData({ ...formData, down: e.target.value })}
                      className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-[var(--lime)] transition-colors"
                      placeholder="e.g. 2000"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[var(--mu2)] mb-2">Alternative Vehicle (Optional)</label>
                <div className="relative">
                  <Car className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--mu2)]" />
                  <input
                    type="text"
                    value={formData.alternative}
                    onChange={(e) => setFormData({ ...formData, alternative: e.target.value })}
                    className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-[var(--lime)] transition-colors"
                    placeholder="e.g. 2024 Honda Civic Sport"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[var(--mu2)] mb-2">Message to Client</label>
                <textarea
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--lime)] transition-colors min-h-[100px] resize-none"
                  placeholder="Explain your offer..."
                />
              </div>

              <button
                type="submit"
                disabled={loading || (!formData.payment && !formData.alternative && !formData.message)}
                className="w-full bg-[var(--lime)] text-black font-bold uppercase tracking-widest py-4 rounded-xl hover:bg-[var(--lime2)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                  'Send Offer'
                )}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
