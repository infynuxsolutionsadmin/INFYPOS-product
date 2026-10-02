import { IsEnum, IsOptional, IsString, IsArray, ValidateNested, IsDateString, IsNumber, Min } from 'class-validator';
import { PurchaseStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { CreatePurchaseItemDto } from './create-purchase.dto';

export class UpdatePurchaseDto {
  @IsEnum(PurchaseStatus)
  @IsOptional()
  status?: PurchaseStatus;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsDateString()
  @IsOptional()
  orderDate?: string;

  @IsDateString()
  @IsOptional()
  expectedDate?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  discountAmount?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseItemDto)
  @IsOptional()
  items?: CreatePurchaseItemDto[];
}
