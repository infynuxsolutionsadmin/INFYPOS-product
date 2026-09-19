import appConfig, { AppConfig } from './app.config';
import databaseConfig, { DatabaseConfig } from './database.config';
import jwtConfig, { JwtConfig } from './jwt.config';
import redisConfig, { RedisConfig } from './redis.config';
import storageConfig, { StorageConfig } from './storage.config';

export interface AllConfigType {
  app: AppConfig;
  database: DatabaseConfig;
  jwt: JwtConfig;
  redis: RedisConfig;
  storage: StorageConfig;
}

export const configurations = [
  appConfig,
  databaseConfig,
  jwtConfig,
  redisConfig,
  storageConfig,
];

export {
  appConfig,
  databaseConfig,
  jwtConfig,
  redisConfig,
  storageConfig,
};
