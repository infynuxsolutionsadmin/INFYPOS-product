import { IsArray, IsString, IsUUID } from 'class-validator';

export class UpdateRolePermissionsDto {
  @IsArray()
  @IsString({ each: true })
  @IsUUID('4', { each: true })
  permissionIds: string[];
}
