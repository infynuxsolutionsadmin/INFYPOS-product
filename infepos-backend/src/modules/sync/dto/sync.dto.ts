import { IsString, IsArray, ValidateNested, IsNotEmpty, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class SyncEventDto {
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @IsString()
  @IsNotEmpty()
  eventType: string; // 'SALE', 'SALE_RETURN', 'SHIFT_OPEN', 'SHIFT_CLOSE'

  @IsString()
  @IsNotEmpty()
  occurredAt: string;

  @IsObject()
  payload: any;
}

export class SyncPayloadDto {
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncEventDto)
  events: SyncEventDto[];
}
