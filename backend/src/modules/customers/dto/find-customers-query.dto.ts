import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { CustomerStatus, CustomerType } from '@prisma/client';
import { Type } from 'class-transformer';

export class FindCustomersQueryDto {
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

  @IsEnum(CustomerStatus)
  @IsOptional()
  status?: CustomerStatus;

  @IsEnum(CustomerType)
  @IsOptional()
  customerType?: CustomerType;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
