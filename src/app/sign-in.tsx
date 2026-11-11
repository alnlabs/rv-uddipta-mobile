import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { BrandScreen } from "@/components/Screen";
import { finishAuthRedirect } from "@/lib/finishAuth";
import { phoneGoogleReady, signInWithPhoneGoogle } from "@/lib/google";
import { normalizePhone, phoneToEmail } from "@/lib/phone";
import { supabase } from "@/lib/supabase";
import { colors, fonts, ui } from "@/theme";

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
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");

  async function signInGoogle() {
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
        options: {
          redirectTo: appUrl,
          skipBrowserRedirect: true,
          queryParams: { prompt: "select_account" },
        },
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

  async function signInStaff() {
    setBusy(true);
    setMessage("");
    try {
      const normalized = normalizePhone(phone);
      if (!normalized) throw new Error("Enter a valid 10-digit phone number.");
      const digits = pin.replace(/\D/g, "");
      if (!/^\d{4,6}$/.test(digits)) throw new Error("PIN must be 4 to 6 digits.");
      const { error } = await supabase.auth.signInWithPassword({
        email: phoneToEmail(normalized),
        password: digits,
      });
      if (error) throw new Error("Phone or PIN is wrong.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <BrandScreen />
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 20, paddingBottom: insets.bottom + 24 }}>
        <View style={{ borderRadius: 24, backgroundColor: colors.white, padding: 24, gap: 14 }}>
          <Text style={ui.eyebrow}>RV Uddiipta</Text>
          <Text style={ui.title}>Sign in</Text>
          <Text style={ui.body}>Homes use Google. Staff use phone + PIN.</Text>
          {message ? <Text style={ui.error}>{message}</Text> : null}

          <Text style={{ color: colors.muted, fontFamily: fonts.display, fontSize: 11, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase" }}>
            Staff
          </Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="Phone"
            placeholderTextColor={colors.placeholder}
            editable={!busy}
            style={ui.field}
          />
          <TextInput
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            secureTextEntry
            placeholder="PIN"
            placeholderTextColor={colors.placeholder}
            maxLength={6}
            editable={!busy}
            style={ui.field}
          />
          <Pressable
            onPress={() => { signInStaff().catch(() => undefined); }}
            disabled={busy}
            style={[ui.button, busy ? { opacity: 0.6 } : null]}
          >
            <Text style={ui.buttonText}>{busy ? "Signing in…" : "Sign in with PIN"}</Text>
          </Pressable>

          <View style={{ height: 1, backgroundColor: colors.line, marginVertical: 4 }} />

          <Pressable
            onPress={() => { signInGoogle().catch(() => undefined); }}
            disabled={busy}
            style={[ui.button, { backgroundColor: colors.white, borderWidth: 1, borderColor: "rgba(15,23,42,0.16)" }, busy ? { opacity: 0.6 } : null]}
          >
            <Text style={[ui.buttonText, { color: colors.ink }]}>
              {busy ? "Opening Google…" : "Sign in with Google"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
