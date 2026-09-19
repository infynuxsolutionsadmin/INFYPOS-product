import { IsEnum, IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { AdjustmentReason, AdjustmentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { CreateInventoryAdjustmentItemDto } from './create-inventory-adjustment.dto';

export class UpdateInventoryAdjustmentDto {
  @IsEnum(AdjustmentReason)
  @IsOptional()
  reason?: AdjustmentReason;

  @IsEnum(AdjustmentStatus)
  @IsOptional()
  status?: AdjustmentStatus;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInventoryAdjustmentItemDto)
  @IsOptional()
  items?: CreateInventoryAdjustmentItemDto[];
}
