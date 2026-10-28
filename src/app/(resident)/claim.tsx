import { useCallback, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Back, Loading, Note, Screen } from "@/components/Screen";
import { loadRegistration, submitRegistration } from "@/lib/office";
import { colors, ui } from "@/theme";

export default function ClaimScreen() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [kind, setKind] = useState<"owner" | "family">("owner");
  const [phone, setPhone] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [flatNumber, setFlatNumber] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Awaited<ReturnType<typeof loadRegistration>> | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await loadRegistration();
      setStatus(data);
      if (data.name) setOwnerName(data.name);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load your claim.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function submit() {
    if (saving) return;
    setSaving(true);
    setMessage("");
    try {
      const result = await submitRegistration({ kind, phone, ownerName, flatNumber });
      setMessage(result.message);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send your claim.");
    } finally {
      setSaving(false);
    }
  }

  const pending = status?.request?.status === "pending";
  const linked = Boolean(status?.flatNumber);

  return (
    <Screen onRefresh={load}>
      <Back />
      <Text style={ui.eyebrow}>Your home</Text>
      <Text style={ui.title}>Claim flat</Text>
      <Text style={ui.body}>Tell the office which brochure flat is yours. Guests do not need this — only people who live here.</Text>
      {!ready ? <Loading /> : null}
      {linked ? (
        <Note text={`Your home is ${status?.flatNumber}. You are ready to use the app.`} tone="ok" />
      ) : null}
      {pending ? (
        <Note text={`Waiting for approval on ${status?.request?.flatNumber}. The office will open your home after they check.`} />
      ) : null}
      {status?.request?.status === "rejected" ? (
        <Note text={status.request.reason || "That claim was not approved. You can send a new one."} />
      ) : null}
      {!linked && !pending ? (
        <View style={ui.card}>
          <Text style={ui.label}>I am</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(["owner", "family"] as const).map((item) => (
              <Pressable
                key={item}
                onPress={() => setKind(item)}
                style={[ui.button, { flex: 1, backgroundColor: kind === item ? colors.button : colors.white, borderWidth: 1, borderColor: colors.button }]}
              >
                <Text style={[ui.buttonText, { color: kind === item ? colors.onButton : colors.button }]}>
                  {item === "owner" ? "Owner" : "Family"}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput value={ownerName} onChangeText={setOwnerName} placeholder="Your name" placeholderTextColor={colors.placeholder} style={ui.field} />
          <TextInput value={phone} onChangeText={setPhone} placeholder="10-digit phone" placeholderTextColor={colors.placeholder} style={ui.field} keyboardType="phone-pad" />
          <TextInput value={flatNumber} onChangeText={setFlatNumber} autoCapitalize="characters" placeholder="Flat, for example A101" placeholderTextColor={colors.placeholder} style={ui.field} />
          <Pressable disabled={saving} onPress={submit} style={ui.button}>
            <Text style={ui.buttonText}>{saving ? "Sending…" : "Send to office"}</Text>
          </Pressable>
        </View>
      ) : null}
      {linked ? (
        <Pressable onPress={() => router.replace("/(resident)")} style={ui.button}>
          <Text style={ui.buttonText}>Open home</Text>
        </Pressable>
      ) : null}
      {message ? <Note text={message} /> : null}
    </Screen>
  );
}
