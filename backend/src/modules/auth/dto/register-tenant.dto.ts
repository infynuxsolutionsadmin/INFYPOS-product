import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterTenantDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  storeName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[A-Z0-9_-]+$/i, {
    message: 'tenantCode can only contain letters, numbers, hyphens, and underscores',
  })
  tenantCode: string;

  @IsString()
  @IsNotEmpty()
  ownerFirstName: string;

  @IsString()
  @IsNotEmpty()
  ownerLastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsOptional()
  plan?: string; // STARTER, PRO, ENTERPRISE

  @IsString()
  @IsOptional()
  billingCycle?: string; // MONTHLY, ANNUAL

  @IsString()
  @IsOptional()
  paymentReference?: string;
}
