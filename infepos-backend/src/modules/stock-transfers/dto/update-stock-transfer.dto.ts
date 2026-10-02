import { IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateStockTransferItemDto } from './create-stock-transfer.dto';

export class UpdateStockTransferDto {
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
  @IsOptional()
  items?: CreateStockTransferItemDto[];
}

export class ReceiveStockTransferDto {
  @IsString()
  @IsOptional()
  receivedNotes?: string;
}
