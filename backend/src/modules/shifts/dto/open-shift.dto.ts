import { IsNumber, Min, IsOptional, IsString } from 'class-validator';

export class OpenShiftDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  startingFloat: number;

  @IsOptional()
  @IsString()
  registerId?: string;
}
