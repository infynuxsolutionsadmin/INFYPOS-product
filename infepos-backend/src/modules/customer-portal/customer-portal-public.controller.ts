import { Controller, Post, Body, Ip, UseGuards } from '@nestjs/common';
import { CustomerPortalService } from './customer-portal.service';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';

@Controller('v1/portal/download')
@UseGuards(ThrottlerGuard)
export class CustomerPortalPublicController {
  constructor(private readonly customerPortalService: CustomerPortalService) {}

  @Post('request-otp')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute per IP
  async requestOtp(@Body('contact') contact: string) {
    if (!contact) throw new Error('Contact (email or phone) is required');
    return this.customerPortalService.requestOtp(contact);
  }

  @Post('verify-otp')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 attempts per minute per IP
  async verifyOtp(
    @Body('contact') contact: string,
    @Body('otp') otp: string,
    @Ip() ip: string,
  ) {
    if (!contact || !otp) throw new Error('Contact and OTP are required');
    // Extract IP cleanly if passing through proxies
    const ipAddress = ip || 'unknown';
    return this.customerPortalService.verifyOtp(contact, otp, ipAddress);
  }
}
