import { registerAs } from '@nestjs/config';

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
  (): JwtConfig => ({
    secret:
      process.env.JWT_ACCESS_SECRET ||
      'super_secret_jwt_access_key_infepos_enterprise_2026',
    expiresIn: process.env.JWT_ACCESS_EXPIRES || '1h',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ||
      'super_secret_jwt_refresh_key_infepos_enterprise_2026',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
    resetPasswordSecret:
      process.env.RESET_PASSWORD_SECRET ||
      'super_secret_reset_password_key_infepos_2026',
    resetPasswordExpiresIn: process.env.RESET_PASSWORD_EXPIRES_IN || '1h',
    issuer: process.env.JWT_ISSUER || 'infepos-api',
    audience: process.env.JWT_AUDIENCE || 'infepos-clients',
  }),
);
