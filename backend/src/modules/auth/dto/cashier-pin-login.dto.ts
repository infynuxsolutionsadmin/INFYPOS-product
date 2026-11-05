import { IsNotEmpty, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class CashierPinLoginDto {
  @IsUUID('4')
  @IsOptional()
  cashierId?: string;

  @IsUUID('4')
  @IsOptional()
  userId?: string;

  @IsUUID('4')
  @IsOptional()
  storeId?: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4,10}$/, { message: 'PIN code must be between 4 and 10 digits' })
  pin: string;
}
