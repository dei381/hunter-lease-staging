import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader2 } from 'lucide-react';
import { getAuthToken } from '../utils/auth';

// Initialize Stripe outside of component to avoid recreating the object
// We use a placeholder key if env var is missing, but in production this should be the real publishable key
const stripePromise = loadStripe((import.meta as any).env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

interface StripePaymentFormProps {
  leadId: string;
  onSuccess: () => void;
  onError: (error: string) => void;
  amount: number;
}

const CheckoutForm = ({ onSuccess, onError }: { onSuccess: () => void, onError: (error: string) => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // We don't want to redirect if we can avoid it, to keep the user in the modal
        // But some payment methods require redirection.
      },
      redirect: 'if_required'
    });

    if (error) {
      onError(error.message || 'An unknown error occurred');
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      onSuccess();
    } else {
      onError('Payment failed or requires further action.');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <button
        disabled={!stripe || isProcessing}
        className="w-full bg-black text-white font-bold text-[10px] uppercase tracking-widest px-6 py-4 rounded-xl hover:bg-[var(--lime)] hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          'Pay $95 Deposit'
        )}
      </button>
    </form>
  );
};

export const StripePaymentForm = ({ leadId, onSuccess, onError, amount }: StripePaymentFormProps) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPaymentIntent = async () => {
      try {
        const token = await getAuthToken();
        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ leadId })
        });

        if (!response.ok) {
          throw new Error('Failed to initialize payment');
        }

        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (error: any) {
        onError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (leadId) {
      fetchPaymentIntent();
    }
  }, [leadId, onError]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <Loader2 className="w-8 h-8 text-[var(--lime)] animate-spin" />
        <p className="text-sm text-[var(--mu2)]">Initializing secure payment...</p>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="text-center py-8 text-red-500 text-sm">
        Failed to load payment form. Please try another payment method.
      </div>
    );
  }

  if (clientSecret?.startsWith('pi_mock_secret')) {
    return (
      <div className="bg-white p-8 rounded-xl border border-[var(--b2)] text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">⚠️</span>
        </div>
        <h3 className="text-lg font-bold mb-2">Test Mode Active</h3>
        <p className="text-sm text-[var(--mu2)] mb-6">
          Stripe is not fully configured (missing STRIPE_SECRET_KEY). 
          Click below to simulate a successful payment.
        </p>
        <button
          onClick={onSuccess}
          className="w-full bg-black text-white font-bold text-[10px] uppercase tracking-widest px-6 py-4 rounded-xl hover:bg-[var(--lime)] hover:text-black transition-all"
        >
          Simulate Payment Success
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-xl border border-[var(--b2)]">
      <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
        <CheckoutForm onSuccess={onSuccess} onError={onError} />
      </Elements>
    </div>
  );
};
