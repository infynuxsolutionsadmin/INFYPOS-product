import { ProductStatus } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  sku?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  barcode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

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
  @IsOptional()
  @MaxLength(50)
  unit?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  costPrice?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  sellingPrice?: number;

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
