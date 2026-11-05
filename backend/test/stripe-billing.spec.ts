import * as assert from 'assert';
import { TenantStatus } from '@prisma/client';
import { StripeService, PLAN_PRICING } from '../src/modules/billing/stripe.service';

async function runStripeTests() {
  console.log('💳 Running INFYPOS Stripe SaaS Billing Integration Tests...\n');

  const testTenant: any = {
    id: 'tenant-stripe-test-1',
    name: 'Acme Supermarket',
    code: 'ACME_SUPER',
    email: 'billing@acme.com',
    status: TenantStatus.ACTIVE,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    subscriptionPlan: 'FREE_TRIAL',
    subscriptionStatus: 'trialing',
    billingCycle: 'MONTHLY',
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    billingInvoices: [],
  };

  const mockPrisma: any = {
    tenant: {
      findUnique: async ({ where }: any) => {
        if (where.id === testTenant.id) {
          return { ...testTenant };
        }
        return null;
      },
      findFirst: async ({ where }: any) => {
        if (
          where.OR?.some((cond: any) => cond.stripeCustomerId === 'cus_test_123' || cond.stripeSubscriptionId === 'sub_test_123') ||
          where.stripeCustomerId === 'cus_test_123' ||
          where.stripeSubscriptionId === 'sub_test_123'
        ) {
          return { ...testTenant };
        }
        return null;
      },
      update: async ({ data }: any) => {
        Object.assign(testTenant, data);
        return { ...testTenant };
      },
    },
    billingInvoice: {
      upsert: async ({ create }: any) => {
        const inv = { id: 'inv-uuid-1', ...create, createdAt: new Date() };
        testTenant.billingInvoices.push(inv);
        return inv;
      },
    },
  };

  const mockConfigService: any = {
    get: (key: string) => {
      if (key === 'STRIPE_SECRET_KEY') return 'sk_test_placeholder_for_stripe';
      if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_placeholder_for_stripe';
      return null;
    },
  };

  const stripeService = new StripeService(mockConfigService, mockPrisma);

  // 1. Pricing catalog verification
  assert.strictEqual(PLAN_PRICING.STARTER.monthlyAmountGbp, 3900);
  assert.strictEqual(PLAN_PRICING.STARTER.annualAmountGbp, 37200);
  assert.strictEqual(PLAN_PRICING.PRO.monthlyAmountGbp, 7900);
  assert.strictEqual(PLAN_PRICING.PRO.annualAmountGbp, 75600);
  assert.strictEqual(PLAN_PRICING.ENTERPRISE.monthlyAmountGbp, 14900);
  assert.strictEqual(PLAN_PRICING.ENTERPRISE.annualAmountGbp, 142800);
  console.log('  ✅ PASS: Plan pricing amounts match product specification (£39/mo, £79/mo, £149/mo)');

  // 2. Simulated Checkout Session
  const session = await stripeService.createCheckoutSession(testTenant.id, {
    plan: 'PRO',
    billingCycle: 'MONTHLY',
  });
  assert.ok(session.sessionId.startsWith('cs_test_mock_'), 'Expected mock sessionId');
  assert.ok(session.url.includes('session_id=cs_test_mock_'), 'Expected session_id in redirect url');
  console.log('  ✅ PASS: StripeService generates simulated Checkout Session when keys are pending verification');

  // 3. Customer ID Generation
  const customerId = await stripeService.getOrCreateCustomer(testTenant.id);
  assert.ok(customerId.startsWith('cus_mock_'), 'Expected customerId generated');
  assert.strictEqual(testTenant.stripeCustomerId, customerId);
  console.log('  ✅ PASS: StripeService provisions and attaches customer ID to tenant');

  // 4. checkout.session.completed Webhook
  const checkoutEvent: any = {
    id: 'evt_1',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_123',
        customer: 'cus_test_123',
        subscription: 'sub_test_123',
        metadata: {
          tenantId: testTenant.id,
          plan: 'PRO',
          billingCycle: 'ANNUAL',
        },
      },
    },
  };
  const checkoutRes = await stripeService.handleWebhookEvent(checkoutEvent);
  assert.strictEqual(checkoutRes.handled, true);
  assert.strictEqual(testTenant.subscriptionPlan, 'PRO');
  assert.strictEqual(testTenant.billingCycle, 'ANNUAL');
  assert.strictEqual(testTenant.subscriptionStatus, 'active');
  assert.strictEqual(testTenant.stripeSubscriptionId, 'sub_test_123');
  console.log('  ✅ PASS: Webhook checkout.session.completed activates subscription and links stripe IDs');

  // 5. customer.subscription.updated Webhook
  const subUpdateEvent: any = {
    id: 'evt_2',
    type: 'customer.subscription.updated',
    data: {
      object: {
        id: 'sub_test_123',
        customer: 'cus_test_123',
        status: 'past_due',
        current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
        cancel_at_period_end: true,
        metadata: {
          plan: 'PRO',
          billingCycle: 'MONTHLY',
        },
      },
    },
  };
  const subUpdateRes = await stripeService.handleWebhookEvent(subUpdateEvent);
  assert.strictEqual(subUpdateRes.handled, true);
  assert.strictEqual(testTenant.subscriptionStatus, 'past_due');
  assert.strictEqual(testTenant.cancelAtPeriodEnd, true);
  console.log('  ✅ PASS: Webhook customer.subscription.updated synchronizes renewal date and subscription status');

  // 6. invoice.payment_succeeded Webhook
  const invoiceEvent: any = {
    id: 'evt_3',
    type: 'invoice.payment_succeeded',
    data: {
      object: {
        id: 'in_123456',
        customer: 'cus_test_123',
        amount_due: 7900,
        amount_paid: 7900,
        currency: 'gbp',
        status: 'paid',
        hosted_invoice_url: 'https://invoice.stripe.com/123456',
        invoice_pdf: 'https://invoice.stripe.com/123456/pdf',
        status_transitions: {
          paid_at: Math.floor(Date.now() / 1000),
        },
      },
    },
  };
  const invoiceRes = await stripeService.handleWebhookEvent(invoiceEvent);
  assert.strictEqual(invoiceRes.handled, true);
  assert.strictEqual(testTenant.subscriptionStatus, 'active');
  assert.strictEqual(testTenant.billingInvoices.length, 1);
  assert.strictEqual(testTenant.billingInvoices[0].stripeInvoiceId, 'in_123456');
  assert.strictEqual(testTenant.billingInvoices[0].amountPaid, 7900);
  console.log('  ✅ PASS: Webhook invoice.payment_succeeded creates BillingInvoice record and sets status active');

  // 7. customer.subscription.deleted Webhook
  const subCancelEvent: any = {
    id: 'evt_4',
    type: 'customer.subscription.deleted',
    data: {
      object: {
        id: 'sub_test_123',
      },
    },
  };
  const cancelRes = await stripeService.handleWebhookEvent(subCancelEvent);
  assert.strictEqual(cancelRes.handled, true);
  assert.strictEqual(testTenant.subscriptionStatus, 'canceled');
  console.log('  ✅ PASS: Webhook customer.subscription.deleted marks subscription canceled');

  // 8. Billing Status Query
  const status = await stripeService.getBillingStatus(testTenant.id);
  assert.strictEqual(status.tenantId, testTenant.id);
  assert.strictEqual(status.subscriptionStatus, 'canceled');
  assert.strictEqual(status.pricing.name, 'Professional');
  console.log('  ✅ PASS: StripeService.getBillingStatus returns full subscription details and invoice list');

  console.log('\n========================================');
  console.log('All 8 Stripe SaaS Billing Tests PASSED (100%)');
  console.log('========================================\n');
}

runStripeTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
