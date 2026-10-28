import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Back, Note, Screen } from "@/components/Screen";
import { walkInVisitor } from "@/lib/office";
import { colors, ui } from "@/theme";

export default function WalkInScreen() {
  const router = useRouter();
  const [visitorName, setVisitorName] = useState("");
  const [flatNumber, setFlatNumber] = useState("");
  const [purpose, setPurpose] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (saving) return;
    setSaving(true);
    setMessage("");
    try {
      const result = await walkInVisitor({ visitorName, flatNumber, purpose });
      router.replace(`/(security)/check?code=${encodeURIComponent(result.code)}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not log the walk-in.");
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Back />
      <Text style={ui.eyebrow}>Gate</Text>
      <Text style={ui.title}>Walk-in</Text>
      <Text style={ui.body}>Visitor arrived without a pass. The home gets a notice to answer.</Text>
      <View style={ui.card}>
        <TextInput value={visitorName} onChangeText={setVisitorName} placeholder="Visitor name" placeholderTextColor={colors.placeholder} style={ui.field} />
        <TextInput value={flatNumber} onChangeText={setFlatNumber} autoCapitalize="characters" placeholder="Home, for example A101" placeholderTextColor={colors.placeholder} style={ui.field} />
        <TextInput value={purpose} onChangeText={setPurpose} placeholder="Why they came (optional)" placeholderTextColor={colors.placeholder} style={ui.field} />
        <Pressable disabled={saving} onPress={submit} style={ui.button}>
          <Text style={ui.buttonText}>{saving ? "Logging…" : "Log walk-in"}</Text>
        </Pressable>
      </View>
      {message ? <Note text={message} /> : null}
    </Screen>
  );
}
