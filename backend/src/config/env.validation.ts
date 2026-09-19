import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
  Staging = 'staging',
}

export enum StorageDriver {
  Local = 'local',
  S3 = 's3',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsString()
  @IsOptional()
  APP_NAME: string = 'INFEPOS Backend';

  @IsInt()
  @Min(0)
  @Max(65535)
  @IsOptional()
  APP_PORT: number = 3000;

  @IsString()
  @IsOptional()
  APP_HOST: string = '0.0.0.0';

  @IsString()
  @IsOptional()
  API_PREFIX: string = 'api';

  @IsString()
  @IsOptional()
  API_VERSION: string = 'v1';

  // Database Validation
  @IsString()
  @IsOptional()
  DATABASE_URL: string =
    'postgresql://postgres:postgres@localhost:5432/infypos?schema=public';

  @IsInt()
  @IsOptional()
  DATABASE_POOL_SIZE: number = 20;

  // JWT Auth Validation
  @IsString()
  @IsOptional()
  JWT_ACCESS_SECRET: string =
    'super_secret_jwt_access_key_infepos_enterprise_2026';

  @IsString()
  @IsOptional()
  JWT_ACCESS_EXPIRES: string = '1h';

  @IsString()
  @IsOptional()
  JWT_REFRESH_SECRET: string =
    'super_secret_jwt_refresh_key_infepos_enterprise_2026';

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES: string = '7d';

  @IsInt()
  @IsOptional()
  BCRYPT_SALT_ROUNDS: number = 12;

  // Redis Validation
  @IsString()
  @IsOptional()
  REDIS_HOST: string = 'localhost';

  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  REDIS_PORT: number = 6379;

  @IsInt()
  @IsOptional()
  REDIS_DB: number = 0;

  // Storage Validation
  @IsEnum(StorageDriver)
  @IsOptional()
  STORAGE_DRIVER: StorageDriver = StorageDriver.Local;

  @IsString()
  @IsOptional()
  STORAGE_UPLOAD_DIR: string = './uploads';
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`[Environment Validation Failed]:\n${errors.toString()}`);
  }
  return validatedConfig;
}
