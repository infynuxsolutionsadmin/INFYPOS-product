import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { CreatePortalSessionDto } from './dto/create-portal-session.dto';
import { SelectActiveStoresDto } from './dto/select-active-stores.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { StripeService } from './stripe.service';

interface RequestWithRawBody extends Request {
  rawBody?: Buffer;
}

@Controller('billing')
export class BillingController {
  constructor(private readonly stripeService: StripeService) {}

  /**
   * Create a Stripe Checkout Session for subscription
   */
  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  async createCheckoutSession(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateCheckoutSessionDto,
    @Req() req: Request,
  ) {
    const origin = req.headers.origin || (req.headers.host ? `http://${req.headers.host}` : undefined);
    return this.stripeService.createCheckoutSession(tenantId, dto, origin);
  }

  /**
   * Create a Stripe Customer Billing Portal Session
   */
  @UseGuards(JwtAuthGuard)
  @Post('portal')
  async createPortalSession(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreatePortalSessionDto,
  ) {
    return this.stripeService.createCustomerPortalSession(tenantId, dto.returnUrl);
  }

  /**
   * Get active subscription status and recent invoices
   */
  @UseGuards(JwtAuthGuard)
  @Get('status')
  async getStatus(@CurrentUser('tenantId') tenantId: string) {
    return this.stripeService.getBillingStatus(tenantId);
  }

  /**
   * Get all active subscription plan tiers
   */
  @Get('plans')
  async getPlans() {
    return this.stripeService.getAllPlans();
  }

  /**
   * Update active stores selection on plan downgrade (freezes unselected stores)
   */
  @UseGuards(JwtAuthGuard)
  @Post('select-active-stores')
  async selectActiveStores(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: SelectActiveStoresDto,
  ) {
    return this.stripeService.selectActiveStores(tenantId, dto.plan, dto.activeStoreIds);
  }

  /**
   * Master Admin: Update plan pricing, limits, and features
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('system.tenants.manage')
  @Patch('master/plans/:code')
  async updatePlan(
    @Param('code') code: string,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.stripeService.updatePlan(code, dto);
  }

  /**
   * Stripe Webhook Receiver
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RequestWithRawBody,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const rawBody = req.rawBody || (Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body)));

    try {
      const event = this.stripeService.constructWebhookEvent(rawBody, signature);
      await this.stripeService.handleWebhookEvent(event);
      return { received: true };
    } catch (err: any) {
      throw new BadRequestException(`Webhook signature verification failed: ${err.message}`);
    }
  }
}

