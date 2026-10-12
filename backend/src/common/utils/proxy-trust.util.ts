/**
 * Resolves the narrowest safe Express 'trust proxy' setting from environment.
 * Prevents X-Forwarded-For header spoofing while enabling accurate IP rate limiting.
 */
export function parseTrustProxySetting(
  rawTrustProxy: string | undefined,
  isProduction: boolean,
): { setting: boolean | number | string; warning?: string } {
  if (rawTrustProxy !== undefined && rawTrustProxy.trim() !== '') {
    const trimmed = rawTrustProxy.trim();
    if (trimmed.toLowerCase() === 'false' || trimmed === '0') {
      return { setting: false };
    }
    if (trimmed.toLowerCase() === 'true') {
      return {
        setting: 1,
        warning: 'TRUST_PROXY=true is overly permissive. Defaulted to 1 hop to prevent X-Forwarded-For spoofing.',
      };
    }
    const numericHops = parseInt(trimmed, 10);
    if (!isNaN(numericHops) && numericHops > 0 && String(numericHops) === trimmed) {
      return { setting: numericHops };
    }
    // Subnets, CIDRs, or keywords (e.g. 'loopback', '10.0.0.0/8, 172.16.0.0/12')
    return { setting: trimmed };
  }

  if (!isProduction) {
    return { setting: 'loopback' };
  }

  return {
    setting: false,
    warning: 'TRUST_PROXY is not configured in production. Direct socket IP will be used. Set TRUST_PROXY=1 if deployed behind a single reverse proxy.',
  };
}
