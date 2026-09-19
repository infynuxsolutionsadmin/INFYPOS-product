import { IsEnum, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { PurchaseStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class FindPurchasesQueryDto {
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
  search?: string; // purchaseNumber or supplierName

  @IsUUID()
  @IsOptional()
  storeId?: string;

  @IsUUID()
  @IsOptional()
  supplierId?: string;

  @IsEnum(PurchaseStatus)
  @IsOptional()
  status?: PurchaseStatus;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
