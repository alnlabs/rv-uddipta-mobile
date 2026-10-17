import { useState } from "react";
import { Pressable, Text, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { Chips, PageTitle } from "@/components/Blocks";
import { Note, Screen } from "@/components/Screen";
import { REQUEST_CATEGORIES, sendRequest } from "@/lib/community";
import { colors, ui } from "@/theme";

const categories = REQUEST_CATEGORIES.map((item) => ({ value: item, label: item }));

export default function NewRequestScreen() {
  const router = useRouter();
  const [category, setCategory] = useState(REQUEST_CATEGORIES[0]);
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (saving) return;
    const messageBody = body.trim();
    if (messageBody.length < 2) {
      setMessage("Describe the complaint in a few words.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      await sendRequest(messageBody, category);
      router.replace("/(resident)/requests");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send that.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen title="Raise a complaint">
      <PageTitle kicker="Office" detail="The office sees this on your home. Photos are not stored yet, so write the detail here." />
      <Text style={ui.label}>Category</Text>
      <Chips options={categories} value={category} onChange={setCategory} />
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder="What needs attention?"
        placeholderTextColor={colors.placeholder}
        accessibilityLabel="Complaint description"
        style={[ui.field, { minHeight: 140, textAlignVertical: "top" }]}
        multiline
      />
      <Pressable accessibilityRole="button" onPress={submit} disabled={saving} style={ui.button}>
        <Text style={ui.buttonText}>{saving ? "Sending…" : "Submit complaint"}</Text>
      </Pressable>
      {message ? <Note text={message} /> : null}
    </Screen>
  );
}
