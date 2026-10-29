import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { ApartmentBackdrop, Mark } from "@/components/Screen";
import { finishAuthRedirect } from "@/lib/finishAuth";
import { phoneGoogleReady, signInWithPhoneGoogle } from "@/lib/google";
import { supabase } from "@/lib/supabase";
import { colors, ui } from "@/theme";

/** Supabase rejects a raw LAN IP and sends the browser to the website. */
function appReturnUrl() {
  const url = new URL(Linking.createURL("auth"));
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(url.hostname)) {
    url.hostname = `${url.hostname}.sslip.io`;
  }
  return url.toString();
}

WebBrowser.maybeCompleteAuthSession();

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
      const appUrl = appReturnUrl();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: appUrl, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data.url) throw new Error("Sign-in did not start.");
      const result = await WebBrowser.openAuthSessionAsync(data.url, appUrl);
      if (result.type === "success") await finishAuthRedirect(result.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  const insets = useSafeAreaInsets();

  return (
    <ApartmentBackdrop>
      <View style={{ flex: 1, justifyContent: "flex-end", padding: 20, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}>
        <View style={{ borderRadius: 24, backgroundColor: colors.white, padding: 24, gap: 14 }}>
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
      </View>
    </ApartmentBackdrop>
  );
}
