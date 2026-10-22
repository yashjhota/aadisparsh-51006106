/**
 * Devotee accounts sign in with mobile number + password. Auth requires an
 * email credential, so each normalized Indian mobile number maps to a
 * deterministic synthetic address that never receives mail.
 */
export const MOBILE_EMAIL_DOMAIN = "mobile.aadisparsh.app";

/** Returns a 10-digit Indian mobile number, or null when invalid. */
export function normalizeMobile(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

export function mobileToEmail(mobile: string): string {
  return `91${mobile}@${MOBILE_EMAIL_DOMAIN}`;
}

export function isMobileAccountEmail(email: string | null | undefined): boolean {
  return !!email && email.endsWith(`@${MOBILE_EMAIL_DOMAIN}`);
}
