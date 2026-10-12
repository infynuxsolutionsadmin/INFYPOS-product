import { UserStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, Length, Matches, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  firstName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  lastName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @IsUUID()
  @IsOptional()
  roleId?: string;

  @IsUUID()
  @IsOptional()
  storeId?: string;

  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;

  @IsString()
  @IsOptional()
  @Length(4, 4, { message: 'PIN code must be exactly 4 digits' })
  @Matches(/^\d{4}$/, { message: 'PIN code must contain only numbers' })
  pinCode?: string;
}

