import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, QrCode, CheckCircle2 } from 'lucide-react';

interface VIPCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: any;
}

export const VIPCertificateModal: React.FC<VIPCertificateModalProps> = ({ isOpen, onClose, lead }) => {
  if (!isOpen || !lead) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[var(--bg)] w-full max-w-md rounded-3xl border border-[var(--lime)]/50 overflow-hidden shadow-2xl shadow-[var(--lime)]/10 relative"
        >
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-[var(--mu2)] hover:text-white transition-colors z-10"
          >
            <X size={24} />
          </button>

          <div className="p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-[var(--lime)]/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-[var(--lime)]">
                <ShieldCheck className="w-10 h-10 text-[var(--lime)]" />
              </div>
              <h2 className="text-3xl font-display mb-2 text-[var(--lime)]">VIP Fast-Track</h2>
              <p className="text-[var(--mu2)] text-sm uppercase tracking-widest font-bold">
                Protected by HunterLease
              </p>
            </div>

            <div className="bg-[var(--s1)] border border-[var(--lime)]/30 rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-center mb-6">
                <QrCode className="w-32 h-32 text-white opacity-80" />
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[var(--lime)] shrink-0 mt-0.5" />
                  <p className="text-sm">Your dealer is assigned by HunterLease and has accepted your terms.</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[var(--lime)] shrink-0 mt-0.5" />
                  <p className="text-sm">Your financial terms and monthly payment are locked.</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[var(--lime)] shrink-0 mt-0.5" />
                  <p className="text-sm font-bold text-white">You are NOT required to purchase any dealer add-ons or financial products.</p>
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-xs text-[var(--mu2)] mb-6">
                Show this screen to your dealer representative. If they attempt to change your terms without a valid reason, use the "Report Dealer" button in your dashboard.
              </p>
              <button
                onClick={onClose}
                className="w-full bg-[var(--s2)] text-white font-bold uppercase tracking-widest py-4 rounded-xl hover:bg-[var(--s3)] transition-colors border border-[var(--b2)]"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
