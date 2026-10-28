export const siteUrl = (process.env.EXPO_PUBLIC_SITE_URL || "https://uddipta.vercel.app").replace(/\/$/, "");

export function passShareUrl(code: string) {
  return `${siteUrl}/pass/${String(code).trim().toUpperCase()}`;
}

export function passShareMessage(input: {
  code: string
  visitorName: string
  home: string
  date?: string
}) {
  const link = passShareUrl(input.code);
  const when = input.date ? ` on ${input.date}` : "";
  return `Visitor pass for ${input.visitorName} at RV Uddiipta ${input.home}${when}.\nCode: ${input.code}\nShow this at the gate: ${link}`;
}
