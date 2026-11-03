import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

export enum InventoryImportMode {
  ADD = 'ADD',
  SET = 'SET',
}

export class BulkImportInventoryDto {
  @IsArray()
  items: any[];

  @IsOptional()
  @IsEnum(InventoryImportMode)
  mode?: InventoryImportMode;

  @IsOptional()
  @IsString()
  defaultStoreId?: string;
}
