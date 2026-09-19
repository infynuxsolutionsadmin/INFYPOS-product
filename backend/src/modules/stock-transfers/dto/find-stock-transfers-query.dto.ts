import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, IsDateString } from 'class-validator';
import { TransferStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class FindStockTransfersQueryDto {
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
  sourceStoreId?: string;

  @IsUUID()
  @IsOptional()
  destinationStoreId?: string;

  @IsEnum(TransferStatus)
  @IsOptional()
  status?: TransferStatus;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsUUID()
  @IsOptional()
  createdBy?: string;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
