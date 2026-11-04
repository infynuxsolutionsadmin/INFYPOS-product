/**
 * INFYPOS Security Utilities - JWT Configuration & Secrets Validation
 * REM-03 / SEC-03
 *
 * Dedicated constants and pattern validators for JWT and authentication secrets.
 * Ensures strict isolation between environments and eliminates universal token forgery risks.
 */

export const DEV_TEST_DUMMY_SECRETS = {
  access: 'dev_only_insecure_jwt_access_secret_min_32_chars_2026',
  refresh: 'dev_only_insecure_jwt_refresh_secret_min_32_chars_2026',
  reset: 'dev_only_insecure_jwt_reset_secret_min_32_chars_2026',
} as const;

export const PROHIBITED_SECRET_PATTERNS: readonly RegExp[] = [
  /super_secret/i,
  /infepos_enterprise/i,
  /your_super_secret/i,
  /change_me/i,
  /example/i,
  /placeholder/i,
  /secret123/i,
  /^\${.*}$/, // Unresolved Docker / environment variable placeholders
];

export const MIN_SECRET_LENGTH = 32;

