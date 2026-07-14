export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isAllowedSchoolEmail(email: string) {
  return normalizeEmail(email).endsWith("@keio.jp");
}

export function getSafeReturnTo(value: unknown, fallback: string) {
  const returnTo = String(value || "").trim();
  if (!returnTo.startsWith("/") || returnTo.startsWith("//")) return fallback;
  return returnTo.split("#")[0];
}
