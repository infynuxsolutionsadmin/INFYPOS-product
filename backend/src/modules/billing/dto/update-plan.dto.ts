import { IsArray, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdatePlanDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  badge?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  monthlyPriceGbp?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  annualPriceGbp?: number;

  @IsNumber()
  @IsOptional()
  maxStores?: number;

  @IsNumber()
  @IsOptional()
  maxUsers?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  features?: string[];
}
