import { IsBoolean, IsDateString, IsEmail, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { CustomerStatus, CustomerType } from '@prisma/client';

export class UpdateCustomerDto {
  @IsEnum(CustomerType)
  @IsOptional()
  customerType?: CustomerType;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  addressLine1?: string;

  @IsString()
  @IsOptional()
  addressLine2?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsDateString()
  @IsOptional()
  dob?: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  gstNumber?: string;

  @IsNumber()
  @IsOptional()
  creditLimit?: number;

  @IsBoolean()
  @IsOptional()
  marketingOptIn?: boolean;

  @IsBoolean()
  @IsOptional()
  smsEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  emailEnabled?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(CustomerStatus)
  @IsOptional()
  status?: CustomerStatus;
}
