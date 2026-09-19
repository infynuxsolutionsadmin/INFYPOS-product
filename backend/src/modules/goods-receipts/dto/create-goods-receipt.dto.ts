import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateGoodsReceiptItemDto {
  @IsUUID()
  @IsNotEmpty()
  purchaseItemId: string;

  @IsNumber()
  @Min(0.01)
  receivedQuantity: number;
}

export class CreateGoodsReceiptDto {
  @IsUUID()
  @IsNotEmpty()
  purchaseId: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGoodsReceiptItemDto)
  items: CreateGoodsReceiptItemDto[];
}
