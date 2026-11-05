import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../database/prisma.service';
import { TenantStatus } from '@prisma/client';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';

export interface PlanPricing {
  id: 'STARTER' | 'PRO' | 'ENTERPRISE';
  name: string;
  monthlyAmountGbp: number; // in pence (£39.00 -> 3900)
  annualAmountGbp: number;  // annual rate billed yearly
}

export const PLAN_PRICING: Record<'STARTER' | 'PRO' | 'ENTERPRISE', PlanPricing> = {
  STARTER: {
    id: 'STARTER',
    name: 'Starter Retail',
    monthlyAmountGbp: 3900,
    annualAmountGbp: 37200, // £31/mo * 12
  },
  PRO: {
    id: 'PRO',
    name: 'Professional',
    monthlyAmountGbp: 7900,
    annualAmountGbp: 75600, // £63/mo * 12
  },
  ENTERPRISE: {
    id: 'ENTERPRISE',
    name: 'Enterprise Scale',
    monthlyAmountGbp: 14900,
    annualAmountGbp: 142800, // £119/mo * 12
  },
};

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe | null = null;
  private readonly webhookSecret: string | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const stripeKey =
      this.configService.get<string>('STRIPE_SECRET_KEY') ||
      process.env.STRIPE_SECRET_KEY ||
      '';

    this.webhookSecret =
      this.configService.get<string>('STRIPE_WEBHOOK_SECRET') ||
      process.env.STRIPE_WEBHOOK_SECRET ||
      null;

    if (stripeKey && !stripeKey.includes('placeholder') && stripeKey.startsWith('sk_')) {
      this.stripe = new Stripe(stripeKey);
      this.logger.log('💳 Stripe SDK initialized successfully in production/sandbox mode.');
    } else {
      this.logger.warn(
        '⚠️ STRIPE_SECRET_KEY not configured or is placeholder. Stripe operates in sandbox-stub mode until keys are added.',
      );
    }
  }

  isConfigured(): boolean {
    return this.stripe !== null;
  }

  /**
   * Creates or retrieves a Stripe Customer for the given tenant
   */
  async getOrCreateCustomer(tenantId: string): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    if (tenant.stripeCustomerId) {
      return tenant.stripeCustomerId;
    }

    if (!this.stripe) {
      const mockCustomerId = `cus_mock_${tenant.code.toLowerCase()}_${Date.now()}`;
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { stripeCustomerId: mockCustomerId },
      });
      return mockCustomerId;
    }

    const customer = await this.stripe.customers.create({
      name: tenant.name,
      email: tenant.email || undefined,
      metadata: {
        tenantId: tenant.id,
        tenantCode: tenant.code,
      },
    });

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { stripeCustomerId: customer.id },
    });

    return customer.id;
  }

  /**
   * Create a Stripe Checkout Session for subscription purchase or upgrade
   */
  async createCheckoutSession(
    tenantId: string,
    dto: CreateCheckoutSessionDto,
    clientHost?: string,
  ): Promise<{ url: string; sessionId: string }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    const customerId = await this.getOrCreateCustomer(tenantId);
    const planInfo = PLAN_PRICING[dto.plan];
    const isAnnual = dto.billingCycle === 'ANNUAL';
    const amount = isAnnual ? planInfo.annualAmountGbp : planInfo.monthlyAmountGbp;
    const interval: Stripe.PriceCreateParams.Recurring.Interval = isAnnual ? 'year' : 'month';

    const baseUrl =
      dto.successUrl?.replace(/\/billing.*$/, '') ||
      clientHost ||
      process.env.FRONTEND_URL ||
      'http://localhost:5173';

    const successUrl =
      dto.successUrl ||
      `${baseUrl}/settings?session_id={CHECKOUT_SESSION_ID}&billing=success`;
    const cancelUrl =
      dto.cancelUrl ||
      `${baseUrl}/settings?billing=cancel`;

    if (!this.stripe) {
      // Return simulated checkout session for dev / testing before live credentials
      const mockSessionId = `cs_test_mock_${Date.now()}`;
      this.logger.log(
        `[Stub Checkout] Simulated checkout session created for tenant ${tenant.code}: ${mockSessionId}`,
      );
      return {
        url: `${successUrl.replace('{CHECKOUT_SESSION_ID}', mockSessionId)}`,
        sessionId: mockSessionId,
      };
    }

    const sessionParams: any = {
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `INFEPOS ${planInfo.name} Plan`,
              description: `${planInfo.name} Subscription (${isAnnual ? 'Billed Annually' : 'Billed Monthly'})`,
            },
            unit_amount: amount,
            recurring: {
              interval,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        tenantId: tenant.id,
        tenantCode: tenant.code,
        plan: dto.plan,
        billingCycle: dto.billingCycle,
      },
      subscription_data: {
        metadata: {
          tenantId: tenant.id,
          tenantCode: tenant.code,
          plan: dto.plan,
          billingCycle: dto.billingCycle,
        },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    };

    const session = await this.stripe.checkout.sessions.create(sessionParams);

    return {
      url: session.url || successUrl,
      sessionId: session.id,
    };
  }

  /**
   * Create Stripe Customer Billing Portal Session
   */
  async createCustomerPortalSession(
    tenantId: string,
    returnUrl?: string,
  ): Promise<{ url: string }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    const customerId = await this.getOrCreateCustomer(tenantId);
    const resolvedReturnUrl =
      returnUrl ||
      process.env.FRONTEND_URL ||
      'http://localhost:5173/settings';

    if (!this.stripe) {
      return {
        url: resolvedReturnUrl,
      };
    }

    const portalSession = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: resolvedReturnUrl,
    });

    return {
      url: portalSession.url,
    };
  }

  /**
   * Get active subscription details and plan status for a tenant
   */
  async getBillingStatus(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        billingInvoices: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    const planPricing = PLAN_PRICING[tenant.subscriptionPlan as keyof typeof PLAN_PRICING] || PLAN_PRICING.PRO;

    return {
      tenantId: tenant.id,
      tenantCode: tenant.code,
      stripeCustomerId: tenant.stripeCustomerId,
      stripeSubscriptionId: tenant.stripeSubscriptionId,
      subscriptionPlan: tenant.subscriptionPlan || 'STARTER',
      subscriptionStatus: tenant.subscriptionStatus || 'trialing',
      billingCycle: tenant.billingCycle || 'MONTHLY',
      currentPeriodEnd: tenant.currentPeriodEnd,
      cancelAtPeriodEnd: tenant.cancelAtPeriodEnd,
      pricing: planPricing,
      invoices: tenant.billingInvoices,
      stripeEnabled: this.isConfigured(),
    };
  }

  /**
   * Construct and verify webhook event from raw payload buffer and signature header
   */
  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    if (!this.stripe || !this.webhookSecret) {
      throw new BadRequestException('Stripe webhook verification is not configured');
    }
    return this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
  }

  /**
   * Process Stripe Webhook events asynchronously
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<{ handled: boolean; type: string }> {
    this.logger.log(`📥 Processing Stripe Webhook Event: ${event.type} [${event.id}]`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.handleCheckoutSessionCompleted(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        await this.handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        await this.handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await this.handleInvoicePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await this.handleInvoicePaymentFailed(invoice);
        break;
      }

      default:
        this.logger.debug(`Unhandled Stripe event type: ${event.type}`);
        return { handled: false, type: event.type };
    }

    return { handled: true, type: event.type };
  }

  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    const tenantId = session.metadata?.tenantId;
    const plan = session.metadata?.plan || 'PRO';
    const billingCycle = session.metadata?.billingCycle || 'MONTHLY';
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : (session.subscription as any)?.id;

    if (!tenantId) {
      this.logger.warn(`checkout.session.completed received without tenantId metadata (session: ${session.id})`);
      return;
    }

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        stripeCustomerId: customerId || undefined,
        stripeSubscriptionId: subscriptionId || undefined,
        subscriptionPlan: plan,
        subscriptionStatus: 'active',
        billingCycle,
        status: TenantStatus.ACTIVE,
      },
    });

    this.logger.log(`✅ Tenant ${tenantId} activated with ${plan} subscription (${billingCycle})`);
  }

  private async handleSubscriptionUpdated(subscription: any) {
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
    const plan = subscription.metadata?.plan;
    const billingCycle = subscription.metadata?.billingCycle;

    const tenant = await this.prisma.tenant.findFirst({
      where: {
        OR: [
          { stripeSubscriptionId: subscription.id },
          { stripeCustomerId: customerId },
        ],
      },
    });

    if (!tenant) {
      this.logger.warn(`No tenant found matching subscription ${subscription.id} or customer ${customerId}`);
      return;
    }

    const rawEnd = subscription.current_period_end;
    const currentPeriodEnd = rawEnd ? new Date(rawEnd * 1000) : null;
    const cancelAtPeriodEnd = !!subscription.cancel_at_period_end;
    const status = subscription.status; // 'active', 'past_due', 'trialing', etc.

    await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: status,
        currentPeriodEnd,
        cancelAtPeriodEnd,
        subscriptionPlan: plan || tenant.subscriptionPlan,
        billingCycle: billingCycle || tenant.billingCycle,
        status: status === 'active' || status === 'trialing' ? TenantStatus.ACTIVE : tenant.status,
      },
    });

    this.logger.log(`🔄 Subscription ${subscription.id} for tenant ${tenant.code} updated to status "${status}"`);
  }

  private async handleSubscriptionDeleted(subscription: any) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!tenant) return;

    await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        subscriptionStatus: 'canceled',
        cancelAtPeriodEnd: true,
      },
    });

    this.logger.log(`🚫 Subscription for tenant ${tenant.code} canceled`);
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    if (!customerId) return;

    const tenant = await this.prisma.tenant.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!tenant) return;

    // Persist invoice record in database
    await this.prisma.billingInvoice.upsert({
      where: { stripeInvoiceId: invoice.id },
      create: {
        tenantId: tenant.id,
        stripeInvoiceId: invoice.id,
        amountDue: invoice.amount_due,
        amountPaid: invoice.amount_paid,
        currency: invoice.currency,
        status: invoice.status || 'paid',
        hostedInvoiceUrl: invoice.hosted_invoice_url || null,
        invoicePdf: invoice.invoice_pdf || null,
        paidAt: invoice.status_transitions?.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000)
          : new Date(),
      },
      update: {
        amountPaid: invoice.amount_paid,
        status: invoice.status || 'paid',
        hostedInvoiceUrl: invoice.hosted_invoice_url || null,
        invoicePdf: invoice.invoice_pdf || null,
        paidAt: invoice.status_transitions?.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000)
          : new Date(),
      },
    });

    // Ensure tenant status is active
    await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        subscriptionStatus: 'active',
        status: TenantStatus.ACTIVE,
      },
    });

    this.logger.log(`💰 Invoice ${invoice.id} recorded for tenant ${tenant.code} (amount: £${(invoice.amount_paid / 100).toFixed(2)})`);
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    if (!customerId) return;

    const tenant = await this.prisma.tenant.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!tenant) return;

    await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        subscriptionStatus: 'past_due',
      },
    });

    this.logger.warn(`⚠️ Invoice ${invoice.id} payment failed for tenant ${tenant.code}`);
  }
}
