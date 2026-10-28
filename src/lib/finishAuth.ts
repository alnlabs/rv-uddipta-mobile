import { supabase } from "@/lib/supabase";

const seen = new Set<string>();

function paramsFrom(url: string) {
  const parsed = new URL(url);
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  const read = (key: string) => parsed.searchParams.get(key) ?? hash.get(key);
  return {
    error: read("error_description") ?? read("error"),
    code: read("code"),
    flowId: read("sb_flow_id"),
    accessToken: read("access_token"),
    refreshToken: read("refresh_token"),
  };
}

export function isAuthReturn(url: string) {
  return url.includes("/--/auth") || url.startsWith("rv-uddipta://auth");
}

export async function finishAuthRedirect(url: string) {
  if (!isAuthReturn(url)) return;
  const { error, code, flowId, accessToken, refreshToken } = paramsFrom(url);
  if (error) throw new Error(error);
  const key = code || accessToken;
  if (!key || seen.has(key)) return;
  seen.add(key);
  try {
    if (code) {
      const exchanged = await supabase.auth.exchangeCodeForSession(
        code,
        flowId ? { flowId } : undefined,
      );
      if (exchanged.error) throw exchanged.error;
      return;
    }
    if (!accessToken || !refreshToken) throw new Error("Sign-in did not finish.");
    const session = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (session.error) throw session.error;
  } catch (caught) {
    seen.delete(key);
    throw caught;
  }
}
