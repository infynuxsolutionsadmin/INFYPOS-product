import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateStoreDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9_]+$/, { message: 'code can only contain uppercase letters, numbers, and underscores' })
  @MaxLength(100)
  code: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  addressLine1?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  addressLine2?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  state?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  postalCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  country?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  timezone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  currency?: string;
}
