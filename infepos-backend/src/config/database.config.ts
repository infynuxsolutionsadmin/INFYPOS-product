import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
  url: string;
  type: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  name?: string;
  schema: string;
  poolSize: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  ssl: {
    enabled: boolean;
    rejectUnauthorized: boolean;
  };
  logging: boolean;
}

export default registerAs(
  'database',
  (): DatabaseConfig => ({
    url:
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/infypos?schema=public',
    type: 'postgres',
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT
      ? parseInt(process.env.DATABASE_PORT, 10)
      : 5432,
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    name: process.env.DATABASE_NAME || 'infypos',
    schema: process.env.DATABASE_SCHEMA || 'public',
    poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '20', 10),
    idleTimeoutMillis: parseInt(
      process.env.DATABASE_IDLE_TIMEOUT || '30000',
      10,
    ),
    connectionTimeoutMillis: parseInt(
      process.env.DATABASE_CONN_TIMEOUT || '5000',
      10,
    ),
    ssl: {
      enabled: process.env.DATABASE_SSL === 'true',
      rejectUnauthorized:
        process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
    },
    logging: process.env.DATABASE_LOGGING === 'true',
  }),
);
