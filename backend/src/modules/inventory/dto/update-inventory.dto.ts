import { InventoryStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateInventoryDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  quantityOnHand?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  reservedQuantity?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  minimumStock?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  maximumStock?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  reorderLevel?: number;

  @IsEnum(InventoryStatus)
  @IsOptional()
  status?: InventoryStatus;
}
