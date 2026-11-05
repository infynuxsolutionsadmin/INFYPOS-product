import { IsIn, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['STARTER', 'PRO', 'ENTERPRISE'], {
    message: 'Plan must be one of: STARTER, PRO, ENTERPRISE',
  })
  plan: 'STARTER' | 'PRO' | 'ENTERPRISE';

  @IsString()
  @IsNotEmpty()
  @IsIn(['MONTHLY', 'ANNUAL'], {
    message: 'Billing cycle must be either MONTHLY or ANNUAL',
  })
  billingCycle: 'MONTHLY' | 'ANNUAL';

  @IsOptional()
  @IsUrl({ require_tld: false }, { message: 'successUrl must be a valid URL' })
  successUrl?: string;

  @IsOptional()
  @IsUrl({ require_tld: false }, { message: 'cancelUrl must be a valid URL' })
  cancelUrl?: string;
}

