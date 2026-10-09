import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Back, Note, Screen } from "@/components/Screen";
import { createPass, loadPasses } from "@/lib/community";
import { colors, ui } from "@/theme";

export default function InviteScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [purpose, setPurpose] = useState("");
  const [visitOn, setVisitOn] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (saving) return;
    setSaving(true);
    setMessage("");
    try {
      const code = await createPass({ visitorName: name, phone, purpose, visitOn });
      const data = await loadPasses();
      const created = data.passes.find((pass) => pass.code === code) ?? data.passes[0];
      if (created) router.replace(`/(resident)/pass/${created.id}`);
      else setMessage("Pass created. Open visitor history to see it.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create the pass.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Back />
      <Text style={ui.eyebrow}>Visitors</Text>
      <Text style={ui.title}>Invite</Text>
      <Text style={ui.body}>They show the pass at the gate. They do not get an account.</Text>
      <View style={ui.card}>
        <TextInput value={name} onChangeText={setName} placeholder="Visitor name" placeholderTextColor={colors.placeholder} style={ui.field} />
        <TextInput value={phone} onChangeText={setPhone} placeholder="Phone" placeholderTextColor={colors.placeholder} style={ui.field} keyboardType="phone-pad" />
        <TextInput value={purpose} onChangeText={setPurpose} placeholder="Why they are coming" placeholderTextColor={colors.placeholder} style={ui.field} />
        <TextInput value={visitOn} onChangeText={setVisitOn} placeholder="Date, 2026-10-09" placeholderTextColor={colors.placeholder} style={ui.field} />
        <Pressable onPress={submit} disabled={saving} style={ui.button}>
          <Text style={ui.buttonText}>{saving ? "Creating…" : "Create pass"}</Text>
        </Pressable>
      </View>
      {message ? <Note text={message} tone={message === "Pass created." ? "ok" : "error"} /> : null}
    </Screen>
  );
}
