import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9_]+$/, { message: 'Code must contain only uppercase letters, numbers, and underscores' })
  @MaxLength(50)
  code: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;
}
