import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Mark } from "@/components/Screen";
import { phoneGoogleReady, signInWithPhoneGoogle } from "@/lib/google";
import { supabase } from "@/lib/supabase";
import { ui } from "@/theme";

WebBrowser.maybeCompleteAuthSession();

/** Supabase rejects any return address whose host is a network IP, then opens the website. */
function phoneReturnUrl() {
  const created = Linking.createURL("auth");
  if (!/^exps?:\/\//.test(created)) return created;
  return created.replace(/^(exps?:\/\/)(?:localhost|\d{1,3}(?:\.\d{1,3}){3})/, "$1127.0.0.1");
}

const redirectTo = phoneReturnUrl();

export default function SignInScreen() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function signIn() {
    setBusy(true);
    setMessage("");
    try {
      if (phoneGoogleReady()) {
        await signInWithPhoneGoogle();
        return;
      }
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data.url) throw new Error("Sign-in did not start.");
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== "success") {
        setBusy(false);
        return;
      }
      const url = new URL(result.url);
      const code = url.searchParams.get("code");
      if (code) {
        const exchanged = await supabase.auth.exchangeCodeForSession(code);
        if (exchanged.error) throw exchanged.error;
      } else {
        const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
        const accessToken = hash.get("access_token") ?? url.searchParams.get("access_token");
        const refreshToken = hash.get("refresh_token") ?? url.searchParams.get("refresh_token");
        if (!accessToken || !refreshToken) throw new Error("Sign-in did not finish.");
        const session = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (session.error) throw session.error;
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  const insets = useSafeAreaInsets();

  return (
    <View style={[ui.page, { padding: 24, paddingTop: insets.top + 36, gap: 14 }]}>
      <Mark size={72} />
      <Text style={ui.eyebrow}>RV Uddiipta</Text>
      <Text style={ui.title}>Sign in</Text>
      <Text style={ui.body}>Karmanghat · 238 homes. Use the same Google account as the website.</Text>
      {message ? <Text style={ui.error}>{message}</Text> : null}
      <Pressable
        onPress={signIn}
        disabled={busy}
        style={[ui.button, busy ? { opacity: 0.6 } : null]}
      >
        <Text style={ui.buttonText}>{busy ? "Opening Google…" : "Sign in with Google"}</Text>
      </Pressable>
    </View>
  );
}
