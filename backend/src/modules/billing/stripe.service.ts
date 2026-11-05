import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../database/prisma.service';
import { StoreStatus, TenantStatus } from '@prisma/client';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

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
    
    // Check DB for dynamic plan tier first (with safe fallback for mock prisma in unit tests)
    const dbPlan = this.prisma?.subscriptionPlanTier?.findUnique
      ? await this.prisma.subscriptionPlanTier.findUnique({
          where: { code: dto.plan },
        })
      : null;

    const planInfo = PLAN_PRICING[dto.plan];
    const isAnnual = dto.billingCycle === 'ANNUAL';
    const amount = dbPlan
      ? isAnnual
        ? Math.round(Number(dbPlan.annualPriceGbp) * 12 * 100)
        : Math.round(Number(dbPlan.monthlyPriceGbp) * 100)
      : isAnnual
        ? planInfo.annualAmountGbp
        : planInfo.monthlyAmountGbp;

    const planName = dbPlan?.name || planInfo.name;
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
      // In dev / stub mode: immediately apply the plan upgrade and unfreeze eligible stores
      await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          subscriptionPlan: dto.plan,
          subscriptionStatus: 'active',
          billingCycle: dto.billingCycle,
        },
      });

      // Automatically unfreeze frozen stores that fit within the new plan limit
      await this.autoUnfreezeStores(tenant.id, dto.plan);

      const mockSessionId = `cs_test_mock_${Date.now()}`;
      this.logger.log(
        `[Stub Checkout] Applied immediate upgrade to plan ${dto.plan} for tenant ${tenant.code}: ${mockSessionId}`,
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
              name: `INFEPOS ${planName} Plan`,
              description: `${planName} Subscription (${isAnnual ? 'Billed Annually' : 'Billed Monthly'})`,
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

    const dbPlan = this.prisma?.subscriptionPlanTier?.findUnique
      ? await this.prisma.subscriptionPlanTier.findUnique({
          where: { code: tenant.subscriptionPlan || 'STARTER' },
        })
      : null;

    const fallbackPricing = PLAN_PRICING[tenant.subscriptionPlan as keyof typeof PLAN_PRICING] || PLAN_PRICING.PRO;
    const planPricing = dbPlan
      ? {
          id: dbPlan.code as any,
          name: dbPlan.name,
          monthlyAmountGbp: Math.round(Number(dbPlan.monthlyPriceGbp) * 100),
          annualAmountGbp: Math.round(Number(dbPlan.annualPriceGbp) * 12 * 100),
          maxStores: dbPlan.maxStores,
          maxUsers: dbPlan.maxUsers,
          features: dbPlan.features,
        }
      : fallbackPricing;

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
   * Get all active subscription plan tiers
   */
  async getAllPlans() {
    const dbPlans = this.prisma?.subscriptionPlanTier?.findMany
      ? await this.prisma.subscriptionPlanTier.findMany({
          where: { isActive: true },
          orderBy: { monthlyPriceGbp: 'asc' },
        })
      : [];

    if (dbPlans.length > 0) {
      return dbPlans.map((p) => ({
        id: p.code,
        code: p.code,
        name: p.name,
        description: p.description,
        badge: p.badge,
        monthlyPriceGbp: Number(p.monthlyPriceGbp),
        annualPriceGbp: Number(p.annualPriceGbp),
        maxStores: p.maxStores,
        maxUsers: p.maxUsers,
        features: p.features,
      }));
    }

    return Object.values(PLAN_PRICING).map((p) => ({
      id: p.id,
      code: p.id,
      name: p.name,
      description: null,
      badge: null,
      monthlyPriceGbp: p.monthlyAmountGbp / 100,
      annualPriceGbp: p.annualAmountGbp / 12 / 100,
      maxStores: p.id === 'STARTER' ? 1 : p.id === 'PRO' ? 5 : 9999,
      maxUsers: p.id === 'STARTER' ? 2 : p.id === 'PRO' ? 15 : 9999,
      features: [],
    }));
  }

  /**
   * Master Admin: update plan tier configuration
   */
  async updatePlan(code: string, dto: UpdatePlanDto) {
    return this.prisma.subscriptionPlanTier.upsert({
      where: { code },
      update: {
        name: dto.name,
        description: dto.description,
        badge: dto.badge !== undefined ? dto.badge : undefined,
        monthlyPriceGbp: dto.monthlyPriceGbp !== undefined ? dto.monthlyPriceGbp : undefined,
        annualPriceGbp: dto.annualPriceGbp !== undefined ? dto.annualPriceGbp : undefined,
        maxStores: dto.maxStores !== undefined ? dto.maxStores : undefined,
        maxUsers: dto.maxUsers !== undefined ? dto.maxUsers : undefined,
        features: dto.features,
      },
      create: {
        code,
        name: dto.name || code,
        description: dto.description,
        badge: dto.badge,
        monthlyPriceGbp: dto.monthlyPriceGbp || 0,
        annualPriceGbp: dto.annualPriceGbp || 0,
        maxStores: dto.maxStores || 1,
        maxUsers: dto.maxUsers || 2,
        features: dto.features || [],
        isActive: true,
      },
    });
  }

  /**
   * Downgrade active stores selection (freezes unselected stores)
   */
  async selectActiveStores(tenantId: string, targetPlan: string, activeStoreIds: string[]) {
    const planTier = this.prisma?.subscriptionPlanTier?.findUnique
      ? await this.prisma.subscriptionPlanTier.findUnique({
          where: { code: targetPlan },
        })
      : null;
    const maxStores =
      planTier?.maxStores ?? (targetPlan === 'STARTER' ? 1 : targetPlan === 'PRO' ? 5 : 9999);

    if (maxStores !== -1 && maxStores < 999 && activeStoreIds.length > maxStores) {
      throw new BadRequestException(
        `Selected active stores (${activeStoreIds.length}) exceed the limit of ${maxStores} for the ${planTier?.name || targetPlan} plan.`,
      );
    }

    const allStores = await this.prisma.store.findMany({
      where: { tenantId },
    });

    const activeSet = new Set(activeStoreIds);
    const frozenStoreIds: string[] = [];

    for (const store of allStores) {
      if (activeSet.has(store.id)) {
        await this.prisma.store.update({
          where: { id: store.id },
          data: { status: StoreStatus.ACTIVE, frozenAt: null },
        });
      } else {
        await this.prisma.store.update({
          where: { id: store.id },
          data: { status: StoreStatus.FROZEN, frozenAt: new Date() },
        });
        frozenStoreIds.push(store.id);
      }
    }

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionPlan: targetPlan,
        subscriptionStatus: 'active',
      },
    });

    return {
      success: true,
      plan: targetPlan,
      activeCount: activeStoreIds.length,
      frozenCount: frozenStoreIds.length,
      frozenStoreIds,
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

    // Automatically unfreeze eligible stores on upgrade
    await this.autoUnfreezeStores(tenantId, plan);

    this.logger.log(`✅ Tenant ${tenantId} activated with ${plan} subscription (${billingCycle})`);
  }

  /**
   * Automatically unfreezes stores when upgrading to a plan that allows more stores
   */
  async autoUnfreezeStores(tenantId: string, planCode: string) {
    try {
      const planTier = this.prisma?.subscriptionPlanTier?.findUnique
        ? await this.prisma.subscriptionPlanTier.findUnique({
            where: { code: planCode },
          })
        : null;

      const maxStores =
        planTier?.maxStores ?? (planCode === 'STARTER' ? 1 : planCode === 'PRO' ? 5 : 9999);

      if (maxStores === -1 || maxStores > 1) {
        const activeCount = await this.prisma.store.count({
          where: { tenantId, status: StoreStatus.ACTIVE },
        });

        const slotsAvailable =
          maxStores === -1 || maxStores >= 999 ? 9999 : Math.max(0, maxStores - activeCount);

        if (slotsAvailable > 0) {
          const frozenStores = await this.prisma.store.findMany({
            where: { tenantId, status: StoreStatus.FROZEN },
            orderBy: { createdAt: 'asc' },
            take: slotsAvailable,
          });

          for (const fStore of frozenStores) {
            await this.prisma.store.update({
              where: { id: fStore.id },
              data: {
                status: StoreStatus.ACTIVE,
                frozenAt: null,
              },
            });
            this.logger.log(
              `❄️ Automatically unfroze store ${fStore.name} (${fStore.code}) after upgrade to ${planCode}`,
            );
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`Failed auto-unfreezing stores: ${err.message}`);
    }
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
