import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isSignInWithEmailLink, signInWithEmailLink, auth } from '../firebase';

export const FinishSignUp = () => {
  const [status, setStatus] = useState('Verifying your magic link...');
  const navigate = useNavigate();

  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        email = window.prompt('Please provide your email for confirmation');
      }
      
      if (email) {
        signInWithEmailLink(auth, email, window.location.href)
          .then((result) => {
            window.localStorage.removeItem('emailForSignIn');
            setStatus('Successfully signed in! Redirecting...');
            setTimeout(() => navigate('/dashboard'), 1500);
          })
          .catch((error) => {
            setStatus('Error signing in. The link may have expired.');
            console.error(error);
          });
      }
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6">
      <div className="bg-[var(--s1)] border border-[var(--b2)] rounded-3xl p-8 max-w-md w-full text-center">
        <h2 className="text-2xl font-display tracking-wide mb-4 text-[var(--w)]">Authentication</h2>
        <p className="text-[var(--mu2)]">{status}</p>
      </div>
    </div>
  );
};
