import { useCallback, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Chips, Empty, SectionLabel } from "@/components/Blocks";
import { Note, Screen } from "@/components/Screen";
import { loadMyDocuments, requestDocument, type DocRequest } from "@/lib/business";
import { colors, ui } from "@/theme";

const KINDS = [
  { value: "move_in", label: "Move in" },
  { value: "move_out", label: "Move out" },
  { value: "sale", label: "Sale" },
  { value: "renovation", label: "Renovation" },
  { value: "tenant", label: "Tenant" },
  { value: "other", label: "Other" },
];

export default function NocsScreen() {
  const [items, setItems] = useState<DocRequest[]>([]);
  const [kind, setKind] = useState("move_in");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await loadMyDocuments());
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load requests.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function submit() {
    if (saving) return;
    if (title.trim().length < 2) {
      setMessage("Enter a title.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      await requestDocument({ kind, title: title.trim(), note: note.trim() });
      setTitle("");
      setNote("");
      setMessage("Request submitted.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not submit.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen title="NOC and papers" onRefresh={load} busy={!ready && !message}>
      <Text style={ui.body}>Request move-in, move-out, sale, renovation, or tenant papers from the office.</Text>
      <View style={ui.card}>
        <Text style={ui.label}>New request</Text>
        <Chips options={KINDS} value={kind} onChange={setKind} />
        <TextInput value={title} onChangeText={setTitle} placeholder="Title" placeholderTextColor={colors.placeholder} style={ui.field} />
        <TextInput value={note} onChangeText={setNote} placeholder="Note for the office" placeholderTextColor={colors.placeholder} style={[ui.field, { minHeight: 80 }]} multiline />
        <Pressable disabled={saving} onPress={submit} style={ui.button}>
          <Text style={ui.buttonText}>{saving ? "Sending…" : "Submit"}</Text>
        </Pressable>
      </View>
      {message ? <Note text={message} tone={message.endsWith("submitted.") ? "ok" : "error"} /> : null}
      <SectionLabel title="Your requests" />
      {ready && items.length === 0 ? <Empty title="No requests" detail="Submit one above when you need a paper from the office." /> : null}
      {items.map((item) => (
        <View key={item.id} style={ui.card}>
          <Text style={ui.label}>{item.status} · {item.kind}</Text>
          <Text style={ui.cardTitle}>{item.title}</Text>
          {item.rejectReason ? <Text style={ui.meta}>{item.rejectReason}</Text> : null}
        </View>
      ))}
    </Screen>
  );
}
