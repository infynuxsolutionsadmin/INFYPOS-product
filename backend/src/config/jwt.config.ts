import { registerAs } from '@nestjs/config';
import { DEV_TEST_DUMMY_SECRETS } from './jwt-secrets.util';

export interface JwtConfig {
  secret: string;
  expiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
  resetPasswordSecret: string;
  resetPasswordExpiresIn: string;
  issuer: string;
  audience: string;
}

export default registerAs(
  'jwt',
  (): JwtConfig => {
    const env = process.env.NODE_ENV;
    const isStrict = env === 'production' || env === 'staging';

    return {
      secret:
        process.env.JWT_ACCESS_SECRET ||
        (isStrict ? '' : DEV_TEST_DUMMY_SECRETS.access),
      expiresIn: process.env.JWT_ACCESS_EXPIRES || '1h',
      refreshSecret:
        process.env.JWT_REFRESH_SECRET ||
        (isStrict ? '' : DEV_TEST_DUMMY_SECRETS.refresh),
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES || '30d',
      resetPasswordSecret:
        process.env.RESET_PASSWORD_SECRET ||
        (isStrict ? '' : DEV_TEST_DUMMY_SECRETS.reset),
      resetPasswordExpiresIn: process.env.RESET_PASSWORD_EXPIRES_IN || '1h',
      issuer: process.env.JWT_ISSUER || 'infepos-api',
      audience: process.env.JWT_AUDIENCE || 'infepos-clients',
    };
  },
);
