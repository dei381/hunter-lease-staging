import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, ArrowRight } from 'lucide-react';
import { auth, googleProvider, appleProvider, sendSignInLinkToEmail } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import { useAuthStore } from '../store/authStore';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { authEmail, setAuthEmail } = useAuthStore();
  const [email, setEmail] = useState(authEmail || '');
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && authEmail) {
      setEmail(authEmail);
    }
  }, [isOpen, authEmail]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      await signInWithPopup(auth, appleProvider);
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      const actionCodeSettings = {
        url: window.location.origin + '/finish-sign-up',
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      setIsSent(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-[var(--s1)] border border-[var(--b2)] rounded-3xl p-8 shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 text-[var(--mu2)] hover:text-[var(--w)] transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-display tracking-wide mb-2">Sign In</h2>
            <p className="text-[var(--mu2)] text-sm mb-8">
              Access your dashboard to track your lease deals and applications.
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4 mb-8">
              <button
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 bg-white text-black font-medium py-3 px-4 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                Continue with Google
              </button>
              
              <button
                onClick={handleAppleSignIn}
                className="w-full flex items-center justify-center gap-3 bg-black text-white border border-gray-800 font-medium py-3 px-4 rounded-xl hover:bg-gray-900 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.09 2.31-.86 3.59-.8 1.51.05 2.53.72 3.3 1.84-2.89 1.81-2.42 5.33.48 6.58-.72 1.92-1.66 3.65-2.45 4.55zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Continue with Apple
              </button>
            </div>

            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--b2)]"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[var(--s1)] px-4 text-[var(--mu2)] uppercase tracking-widest font-bold">Or use email</span>
              </div>
            </div>

            {isSent ? (
              <div className="text-center p-6 bg-[var(--lime)]/10 border border-[var(--lime)]/20 rounded-2xl">
                <Mail className="w-8 h-8 text-[var(--lime)] mx-auto mb-3" />
                <h3 className="text-[var(--w)] font-medium mb-1">Check your email</h3>
                <p className="text-[var(--mu2)] text-sm">
                  We sent a magic link to {email}
                </p>
              </div>
            ) : (
              <form onSubmit={handleEmailSignIn} className="space-y-4">
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-xl px-4 py-3 text-[var(--w)] outline-none focus:border-[var(--lime)] transition-colors"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-[var(--lime)] text-white font-bold uppercase tracking-widest py-3 px-4 rounded-xl hover:bg-[var(--lime2)] transition-colors"
                >
                  Send Magic Link
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
