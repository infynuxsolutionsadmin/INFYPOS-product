import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  NotEquals,
  ValidateNested,
} from 'class-validator';
import { AdjustmentReason } from '@prisma/client';

export class CreateInventoryAdjustmentItemDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @NotEquals(0, { message: 'Quantity change cannot be exactly 0' })
  quantityChange: number;
}

export class CreateInventoryAdjustmentDto {
  @IsUUID()
  @IsNotEmpty()
  storeId: string;

  @IsEnum(AdjustmentReason)
  @IsNotEmpty()
  reason: AdjustmentReason;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInventoryAdjustmentItemDto)
  items: CreateInventoryAdjustmentItemDto[];
}
