import db from '../lib/db';

const prisma = db;

/**
 * StripeService — handles $95 deposit payments via Stripe Checkout.
 * 
 * Flow:
 *   1. Client clicks "Secure My Deal"
 *   2. Backend creates Stripe Checkout Session
 *   3. Client redirected to Stripe
 *   4. On success: webhook fires → Payment record updated → Lead status updated
 *   5. On cancel: client returns to site, payment stays "pending"
 */
export class StripeService {

  private static _stripeInstance: any = null;

  private static async getStripe() {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
    if (!this._stripeInstance) {
      const { default: Stripe } = await import('stripe');
      this._stripeInstance = new Stripe(key, { apiVersion: '2023-10-16' as any });
    }
    return this._stripeInstance;
  }

  /**
   * Create a Stripe Checkout Session for a $95 deposit.
   */
  static async createCheckoutSession(params: {
    leadId: string;
    userId?: string;
    quoteId?: string;
    customerEmail?: string;
    vehicleDescription?: string;
  }) {
    const stripe = await this.getStripe();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: params.customerEmail || undefined,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Vehicle Reservation Deposit',
            description: params.vehicleDescription || 'Refundable $95 deposit to secure your deal',
          },
          unit_amount: 9500, // $95.00
        },
        quantity: 1,
      }],
      metadata: {
        leadId: params.leadId,
        userId: params.userId || '',
        quoteId: params.quoteId || '',
      },
      success_url: `${frontendUrl}/deposit/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/deposit/cancel`,
    });

    // Create Payment record
    const payment = await prisma.payment.create({
      data: {
        leadId: params.leadId,
        userId: params.userId || null,
        quoteId: params.quoteId || null,
        stripeSessionId: session.id,
        amountCents: 9500,
        currency: 'usd',
        status: 'pending',
      },
    });

    return { sessionId: session.id, sessionUrl: session.url, paymentId: payment.id };
  }

  /**
   * Handle Stripe webhook events.
   */
  static async handleWebhook(rawBody: Buffer, signature: string) {
    const stripe = await this.getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET is not configured');

    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await this.onCheckoutCompleted(session);
        break;
      }
      case 'checkout.session.expired': {
        const session = event.data.object;
        await this.onCheckoutExpired(session);
        break;
      }
    }

    return { received: true, type: event.type };
  }

  private static async onCheckoutCompleted(session: any) {
    const payment = await prisma.payment.findUnique({
      where: { stripeSessionId: session.id },
    });
    if (!payment) {
      console.error(`Payment not found for session ${session.id}`);
      return;
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'completed',
        stripePaymentIntentId: session.payment_intent,
      },
    });

    // Update lead deposit status
    if (payment.leadId) {
      await prisma.lead.update({
        where: { id: payment.leadId },
        data: {
          depositStatus: 'paid',
          depositAmount: 9500,
          depositId: payment.id,
        },
      });
    }
  }

  private static async onCheckoutExpired(session: any) {
    await prisma.payment.updateMany({
      where: { stripeSessionId: session.id, status: 'pending' },
      data: { status: 'expired' },
    });
  }

  /**
   * Issue a refund for a completed payment.
   */
  static async refundPayment(paymentId: string, reason?: string) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new Error('Payment not found');
    if (payment.status !== 'completed') throw new Error('Payment is not completed, cannot refund');
    if (!payment.stripePaymentIntentId) throw new Error('No payment intent to refund');

    const stripe = await this.getStripe();
    await stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
    });

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'refunded',
        refundedAt: new Date(),
        refundReason: reason || 'Admin initiated refund',
      },
    });

    // Update lead deposit status
    if (payment.leadId) {
      await prisma.lead.update({
        where: { id: payment.leadId },
        data: { depositStatus: 'refunded' },
      });
    }

    return { success: true };
  }

  /**
   * Get payment status by lead ID.
   */
  static async getPaymentByLead(leadId: string) {
    return prisma.payment.findFirst({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
