/** Match portal `lib/phone.ts` / `lib/auth.ts` for staff phone + PIN login. */
export const STAFF_EMAIL_DOMAIN = "owners.rvuddipta.app";

export function normalizePhone(raw: string | null | undefined) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  const phone =
    digits.length === 12 && digits.startsWith("91")
      ? digits.slice(2)
      : digits.length === 11 && digits.startsWith("0")
        ? digits.slice(1)
        : digits;
  return /^\d{10}$/.test(phone) ? phone : null;
}

export function phoneToEmail(phone: string) {
  return `${phone}@${STAFF_EMAIL_DOMAIN}`;
}
