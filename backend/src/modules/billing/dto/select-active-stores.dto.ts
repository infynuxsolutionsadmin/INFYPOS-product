import { IsArray, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class SelectActiveStoresDto {
  @IsString()
  @IsNotEmpty()
  plan: string;

  @IsArray()
  @IsUUID('4', { each: true, message: 'Each active store ID must be a valid UUID' })
  activeStoreIds: string[];
}
