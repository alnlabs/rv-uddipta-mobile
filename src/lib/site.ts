const DEFAULT_SITE = "https://uddipta.vercel.app";

export function siteBaseUrl() {
  return String(process.env.EXPO_PUBLIC_SITE_URL || DEFAULT_SITE).replace(/\/$/, "");
}

/** Public guest page URL — opens QR for security to scan. */
export function passShareUrl(code: string) {
  const normalized = String(code).trim().toUpperCase();
  return `${siteBaseUrl()}/pass/${normalized}`;
}

export function passShareCode(code: string) {
  return String(code).trim().toUpperCase();
}

export function passShareMessage(input: {
  code: string
  visitorName: string
  home: string
  date?: string
}) {
  const code = passShareCode(input.code);
  const link = passShareUrl(code);
  const when = input.date ? ` on ${input.date}` : "";
  return `Visitor pass for ${input.visitorName} at RV Uddiipta ${input.home}${when}.\nOpen this link and show the QR at the gate:\n${link}\nOr show code ${code}.`;
}
