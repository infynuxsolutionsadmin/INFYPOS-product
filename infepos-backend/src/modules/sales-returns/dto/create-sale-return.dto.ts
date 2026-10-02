import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { ReturnReason, PaymentMethod } from '@prisma/client';

export class CreateSaleReturnItemDto {
  @IsUUID('4')
  @IsNotEmpty()
  saleItemId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  quantity: number;

  @IsEnum(ReturnReason)
  @IsNotEmpty()
  reason: ReturnReason;
}

export class CreateSaleReturnDto {
  @IsUUID('4')
  @IsOptional()
  shiftId?: string;

  @IsUUID('4')
  @IsNotEmpty()
  originalSaleId: string;

  @IsEnum(PaymentMethod)
  @IsOptional()
  refundMethod?: PaymentMethod;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleReturnItemDto)
  @ArrayMinSize(1)
  items: CreateSaleReturnItemDto[];
}
