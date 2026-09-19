import { IsNumber, Min, IsOptional, IsString, IsUUID } from 'class-validator';

export class CloseShiftDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  declaredCash: number;

  @IsOptional()
  @IsString()
  @IsUUID()
  managerOverrideId?: string;
}
