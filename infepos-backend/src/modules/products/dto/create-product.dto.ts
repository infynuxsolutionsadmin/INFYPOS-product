import { ProductStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  sku: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  barcode?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  brand?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unit: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  costPrice: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  sellingPrice: number;

  @IsString()
  @IsIn(['STANDARD', 'REDUCED', 'ZERO'])
  @IsOptional()
  vatBand?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsIn([0, 5, 20])
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  vatRate?: number;

  @IsString()
  @IsOptional()
  @MaxLength(1024)
  imageUrl?: string;

  @IsBoolean()
  @IsOptional()
  trackInventory?: boolean;

  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;
}
