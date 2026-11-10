import { siteUrl } from "@/lib/site";
import { supabase } from "@/lib/supabase";

/** Ask the website to send any queued Expo pushes (filled when RPCs insert notifications). */
export async function flushPushOutbox() {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch(`${siteUrl}/api/push/flush`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
  } catch {
    /* Push must not block gate or connect. */
  }
}
