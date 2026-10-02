import { registerAs } from '@nestjs/config';

export interface AppConfig {
  name: string;
  env: string;
  port: number;
  host: string;
  apiPrefix: string;
  apiVersion: string;
  cors: {
    enabled: boolean;
    origin: string | string[];
    credentials: boolean;
  };
  fallbackLanguage: string;
}

export default registerAs(
  'app',
  (): AppConfig => ({
    name: process.env.APP_NAME || 'INFEPOS Backend',
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.APP_PORT || process.env.PORT || '3000', 10),
    host: process.env.APP_HOST || '0.0.0.0',
    apiPrefix: process.env.API_PREFIX || 'api',
    apiVersion: process.env.API_VERSION || 'v1',
    cors: {
      enabled: process.env.CORS_ENABLED !== 'false',
      origin: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
        : '*',
      credentials: process.env.CORS_CREDENTIALS === 'true',
    },
    fallbackLanguage: process.env.APP_FALLBACK_LANGUAGE || 'en',
  }),
);
