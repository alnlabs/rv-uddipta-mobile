import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Back, Note, Screen } from "@/components/Screen";
import { REQUEST_CATEGORIES, sendRequest } from "@/lib/community";
import { colors, ui } from "@/theme";

export default function NewRequestScreen() {
  const router = useRouter();
  const [category, setCategory] = useState(REQUEST_CATEGORIES[0]);
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (saving) return;
    setSaving(true);
    setMessage("");
    try {
      await sendRequest(body, category);
      router.replace("/(resident)/requests");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send that.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Back />
      <Text style={ui.eyebrow}>Office</Text>
      <Text style={ui.title}>New request</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {REQUEST_CATEGORIES.map((item) => (
          <Pressable
            key={item}
            onPress={() => setCategory(item)}
            style={[ui.button, { minHeight: 40, backgroundColor: item === category ? colors.button : colors.white, borderWidth: 1, borderColor: colors.button }]}
          >
            <Text style={[ui.buttonText, { color: item === category ? colors.onButton : colors.button }]}>{item}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder="What do you need?"
        placeholderTextColor={colors.placeholder}
        style={[ui.field, { minHeight: 120, textAlignVertical: "top" }]}
        multiline
      />
      <Text style={ui.body}>Photos are not stored yet. Write the detail in the request.</Text>
      <Pressable onPress={submit} disabled={saving} style={ui.button}>
        <Text style={ui.buttonText}>{saving ? "Sending…" : "Send"}</Text>
      </Pressable>
      {message ? <Note text={message} /> : null}
    </Screen>
  );
}
