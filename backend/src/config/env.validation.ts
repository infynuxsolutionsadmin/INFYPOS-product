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
import {
  DEV_TEST_DUMMY_SECRETS,
  MIN_SECRET_LENGTH,
  PROHIBITED_SECRET_PATTERNS,
} from './jwt-secrets.util';

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
  NODE_ENV!: Environment;

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

  // JWT Auth Validation - No hardcoded fallback initializers
  @IsString()
  @IsOptional()
  JWT_ACCESS_SECRET?: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_EXPIRES: string = '1h';

  @IsString()
  @IsOptional()
  JWT_REFRESH_SECRET?: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES: string = '7d';

  @IsString()
  @IsOptional()
  RESET_PASSWORD_SECRET?: string;

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
  // 1. Strict NODE_ENV Validation
  const rawNodeEnv = config.NODE_ENV;
  if (!rawNodeEnv || typeof rawNodeEnv !== 'string' || rawNodeEnv.trim() === '') {
    throw new Error(
      '[Environment Validation Failed]: NODE_ENV is required and must be one of: development, test, staging, production',
    );
  }

  const validEnvironments = Object.values(Environment) as string[];
  if (!validEnvironments.includes(rawNodeEnv)) {
    throw new Error(
      `[Environment Validation Failed]: Invalid NODE_ENV "${rawNodeEnv}". Must be one of: ${validEnvironments.join(', ')}`,
    );
  }

  // 2. Class-transformer & class-validator processing
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`[Environment Validation Failed]:\n${errors.toString()}`);
  }

  // 3. Environment-Aware Strict Security Checks
  const isStrict =
    validatedConfig.NODE_ENV === Environment.Production ||
    validatedConfig.NODE_ENV === Environment.Staging;

  if (isStrict) {
    const requiredSecrets: Array<{ name: keyof EnvironmentVariables; value: unknown }> = [
      { name: 'JWT_ACCESS_SECRET', value: validatedConfig.JWT_ACCESS_SECRET },
      { name: 'JWT_REFRESH_SECRET', value: validatedConfig.JWT_REFRESH_SECRET },
      { name: 'RESET_PASSWORD_SECRET', value: validatedConfig.RESET_PASSWORD_SECRET },
    ];

    const dummyValues = Object.values(DEV_TEST_DUMMY_SECRETS) as string[];

    for (const { name, value } of requiredSecrets) {
      // Must exist and be a string
      if (!value || typeof value !== 'string') {
        throw new Error(
          `[Environment Validation Failed]: ${name} is required in ${validatedConfig.NODE_ENV} environment. Cannot be empty or undefined.`,
        );
      }

      // Must not be empty or whitespace-only
      if (value.trim().length === 0) {
        throw new Error(
          `[Environment Validation Failed]: ${name} cannot be empty or whitespace in ${validatedConfig.NODE_ENV} environment.`,
        );
      }

      // Reject leading or trailing whitespace without silently trimming
      if (value !== value.trim()) {
        throw new Error(
          `[Environment Validation Failed]: ${name} must not contain leading or trailing whitespace in ${validatedConfig.NODE_ENV} environment.`,
        );
      }

      // Reject prohibited insecure patterns and placeholders
      for (const pattern of PROHIBITED_SECRET_PATTERNS) {
        if (pattern.test(value)) {
          throw new Error(
            `[Environment Validation Failed]: ${name} matches prohibited insecure pattern "${pattern}" in ${validatedConfig.NODE_ENV} environment.`,
          );
        }
      }

      // Explicitly reject development/test dummy secrets
      if (dummyValues.includes(value)) {
        throw new Error(
          `[Environment Validation Failed]: ${name} cannot use development/test dummy secret in ${validatedConfig.NODE_ENV} environment.`,
        );
      }

      // Must satisfy minimum character length
      if (value.length < MIN_SECRET_LENGTH) {
        throw new Error(
          `[Environment Validation Failed]: ${name} must be at least ${MIN_SECRET_LENGTH} characters long in ${validatedConfig.NODE_ENV} environment (current length: ${value.length}).`,
        );
      }
    }

    // 4. Pairwise Distinctness Checks (all 3 combinations)
    if (validatedConfig.JWT_ACCESS_SECRET === validatedConfig.JWT_REFRESH_SECRET) {
      throw new Error(
        `[Environment Validation Failed]: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be distinct secrets in ${validatedConfig.NODE_ENV} environment.`,
      );
    }
    if (validatedConfig.JWT_ACCESS_SECRET === validatedConfig.RESET_PASSWORD_SECRET) {
      throw new Error(
        `[Environment Validation Failed]: JWT_ACCESS_SECRET and RESET_PASSWORD_SECRET must be distinct secrets in ${validatedConfig.NODE_ENV} environment.`,
      );
    }
    if (validatedConfig.JWT_REFRESH_SECRET === validatedConfig.RESET_PASSWORD_SECRET) {
      throw new Error(
        `[Environment Validation Failed]: JWT_REFRESH_SECRET and RESET_PASSWORD_SECRET must be distinct secrets in ${validatedConfig.NODE_ENV} environment.`,
      );
    }
  } else {
    // Non-strict environments (development, test)
    let usedDummy = false;

    if (!validatedConfig.JWT_ACCESS_SECRET) {
      validatedConfig.JWT_ACCESS_SECRET = DEV_TEST_DUMMY_SECRETS.access;
      usedDummy = true;
    }
    if (!validatedConfig.JWT_REFRESH_SECRET) {
      validatedConfig.JWT_REFRESH_SECRET = DEV_TEST_DUMMY_SECRETS.refresh;
      usedDummy = true;
    }
    if (!validatedConfig.RESET_PASSWORD_SECRET) {
      validatedConfig.RESET_PASSWORD_SECRET = DEV_TEST_DUMMY_SECRETS.reset;
      usedDummy = true;
    }

    if (usedDummy) {
      console.warn(
        '[SECURITY NOTICE]: Running with development-only dummy JWT secrets. These are strictly prohibited in production and staging environments.',
      );
    }
  }

  return validatedConfig;
}
