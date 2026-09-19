import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreatePurchaseItemDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @Min(0.01)
  orderedQuantity: number;

  @IsNumber()
  @Min(0)
  unitCost: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;
}

export class CreatePurchaseDto {
  @IsUUID()
  @IsNotEmpty()
  storeId: string;

  @IsUUID()
  @IsNotEmpty()
  supplierId: string;

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
  items: CreatePurchaseItemDto[];
}
