import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { SupplierStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class FindSuppliersQueryDto {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(SupplierStatus)
  @IsOptional()
  status?: SupplierStatus;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
