import React, { useState, useEffect, useEffectEvent } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader2 } from 'lucide-react';
import { getAuthToken } from '../utils/auth';

const stripePublishableKey = (import.meta as any).env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

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
      onError('Payment form is still loading. Please try again in a moment.');
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {},
        redirect: 'if_required'
      });

      if (error) {
        onError(error.message || 'An unknown error occurred');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess();
      } else {
        onError('Payment failed or requires further action.');
      }
    } catch (error: any) {
      onError(error.message || 'Unable to complete payment. Please try again.');
    } finally {
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
  const emitError = useEffectEvent((message: string) => onError(message));

  useEffect(() => {
    if (!leadId) {
      emitError('Unable to start payment without a saved lead.');
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15000);

    const fetchPaymentIntent = async () => {
      try {
        const token = await getAuthToken();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: {
            ...headers,
          },
          body: JSON.stringify({ leadId }),
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error('Failed to initialize payment');
        }

        const data = await response.json();
        if (!stripePublishableKey && !String(data.clientSecret || '').startsWith('pi_mock_secret')) {
          throw new Error('Card payments are temporarily unavailable. Stripe is not fully configured.');
        }
        setClientSecret(data.clientSecret);
      } catch (error: any) {
        if (error.name === 'AbortError') {
          emitError('Payment setup timed out. Please try again.');
        } else {
          emitError(error.message || 'Failed to initialize payment');
        }
      } finally {
        window.clearTimeout(timeoutId);
        setIsLoading(false);
      }
    };

    fetchPaymentIntent();

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [leadId]);

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
          Simulate Payment Success for ${amount}
        </button>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="text-center py-8 text-red-500 text-sm">
        Card payments are temporarily unavailable. Please use another deposit method or try again later.
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
