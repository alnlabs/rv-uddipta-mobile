import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { brandBrown } from "@/components/Screen";
import { finishAuthRedirect } from "@/lib/finishAuth";
import { phoneGoogleReady, signInWithPhoneGoogle } from "@/lib/google";
import { normalizePhone, phoneToEmail } from "@/lib/phone";
import { supabase } from "@/lib/supabase";
import { colors, fonts, ui } from "@/theme";

const logo = require("../../assets/icon-full.png");

type SignTab = "resident" | "staff";

/** Supabase rejects a raw LAN IP and sends the browser to the website. */
function appReturnUrl() {
  const url = new URL(Linking.createURL("auth"));
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(url.hostname)) {
    url.hostname = `${url.hostname}.sslip.io`;
  }
  return url.toString();
}

WebBrowser.maybeCompleteAuthSession();

function Tab({
  label,
  active,
  onPress,
  disabled,
}: {
  label: string
  active: boolean
  onPress: () => void
  disabled?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        flex: 1,
        minHeight: 40,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active ? colors.button : "transparent",
      }}
    >
      <Text style={{
        color: active ? colors.onButton : colors.muted,
        fontFamily: fonts.display,
        fontSize: 14,
        fontWeight: "600",
      }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function SignInScreen() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<SignTab>("resident");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const insets = useSafeAreaInsets();

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

  async function signInResidentForm() {
    setBusy(true);
    setMessage("");
    try {
      const value = email.trim().toLowerCase();
      if (!value || !value.includes("@")) throw new Error("Enter your email.");
      if (!password) throw new Error("Enter your password.");
      const { error } = await supabase.auth.signInWithPassword({
        email: value,
        password,
      });
      if (error) throw new Error("Email or password is wrong.");
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

  return (
    <View style={{ flex: 1, backgroundColor: brandBrown }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 20,
            paddingHorizontal: 20,
            gap: 16,
          }}
        >
          <View style={{ alignItems: "center", paddingVertical: 8 }}>
            <Image
              source={logo}
              accessibilityLabel="RV Uddiipta"
              resizeMode="contain"
              style={{ width: 148, height: 148 }}
            />
          </View>

          <View style={{ borderRadius: 24, backgroundColor: colors.white, padding: 24, gap: 14 }}>
            <Text style={ui.eyebrow}>RV Uddiipta</Text>
            <Text style={ui.title}>Sign in</Text>

            <View style={{
              flexDirection: "row",
              backgroundColor: colors.page,
              borderRadius: 12,
              padding: 4,
              gap: 4,
            }}
            >
              <Tab
                label="Resident"
                active={tab === "resident"}
                disabled={busy}
                onPress={() => {
                  setTab("resident");
                  setMessage("");
                }}
              />
              <Tab
                label="Staff"
                active={tab === "staff"}
                disabled={busy}
                onPress={() => {
                  setTab("staff");
                  setMessage("");
                }}
              />
            </View>

            {message ? <Text style={ui.error}>{message}</Text> : null}

            {tab === "resident" ? (
              <View style={{ gap: 10 }}>
                <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 18 }}>
                  For flats — owners, family, and tenants.
                </Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="Email"
                  placeholderTextColor={colors.placeholder}
                  editable={!busy}
                  style={ui.field}
                />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="Password"
                  placeholderTextColor={colors.placeholder}
                  editable={!busy}
                  style={ui.field}
                />
                <Pressable
                  onPress={() => { signInResidentForm().catch(() => undefined); }}
                  disabled={busy}
                  style={[ui.button, busy ? { opacity: 0.6 } : null]}
                >
                  <Text style={ui.buttonText}>
                    {busy ? "Signing in…" : "Sign in with email"}
                  </Text>
                </Pressable>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 2 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
                  <Text style={{ color: colors.muted, fontFamily: fonts.display, fontSize: 11, fontWeight: "600" }}>OR</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
                </View>

                <Pressable
                  onPress={() => { signInGoogle().catch(() => undefined); }}
                  disabled={busy}
                  style={[ui.button, { backgroundColor: colors.white, borderWidth: 1, borderColor: "rgba(15,23,42,0.16)" }, busy ? { opacity: 0.6 } : null]}
                >
                  <Text style={[ui.buttonText, { color: colors.ink }]}>
                    {busy ? "Opening Google…" : "Continue with Google"}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 18 }}>
                  For security, facility, and service staff — phone + PIN from admin.
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
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
