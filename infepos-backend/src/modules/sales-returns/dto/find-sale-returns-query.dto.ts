import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { ReturnStatus, ReturnType } from '@prisma/client';
import { Type } from 'class-transformer';

export class FindSaleReturnsQueryDto {
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

  @IsEnum(ReturnStatus)
  @IsOptional()
  status?: ReturnStatus;

  @IsEnum(ReturnType)
  @IsOptional()
  returnType?: ReturnType;

  @IsString()
  @IsOptional()
  storeId?: string;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
