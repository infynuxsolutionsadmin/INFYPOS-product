import { Type } from 'class-transformer';
import {
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
import { TransferType } from '@prisma/client';

export class CreateStockTransferItemDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @Min(0.01)
  quantity: number;
}

export class CreateStockTransferDto {
  @IsEnum(TransferType)
  @IsOptional()
  transferType?: TransferType;

  @IsUUID()
  @IsNotEmpty()
  sourceStoreId: string;

  @IsUUID()
  @IsNotEmpty()
  destinationStoreId: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  carrier?: string;

  @IsString()
  @IsOptional()
  vehicleNumber?: string;

  @IsString()
  @IsOptional()
  trackingNumber?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStockTransferItemDto)
  items: CreateStockTransferItemDto[];
}
