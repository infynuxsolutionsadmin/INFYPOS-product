import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, IsDateString } from 'class-validator';
import { AdjustmentReason, AdjustmentStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class FindInventoryAdjustmentsQueryDto {
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

  @IsUUID()
  @IsOptional()
  storeId?: string;

  @IsEnum(AdjustmentReason)
  @IsOptional()
  reason?: AdjustmentReason;

  @IsEnum(AdjustmentStatus)
  @IsOptional()
  status?: AdjustmentStatus;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
