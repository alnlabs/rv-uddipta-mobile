import { useCallback, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Chips, Empty, SectionLabel } from "@/components/Blocks";
import { Note, Screen } from "@/components/Screen";
import { addWorkforce, loadMyWorkforce, type WorkforcePerson } from "@/lib/business";
import { colors, ui } from "@/theme";

const KINDS = [
  { value: "domestic", label: "Domestic" },
  { value: "vendor", label: "Vendor" },
  { value: "cab", label: "Cab" },
];

export default function WorkforceScreen() {
  const [people, setPeople] = useState<WorkforcePerson[]>([]);
  const [kind, setKind] = useState("domestic");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setPeople(await loadMyWorkforce());
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load helpers.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function submit() {
    if (saving) return;
    if (name.trim().length < 2) {
      setMessage("Enter a name.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const result = await addWorkforce({ kind, name: name.trim(), phone: phone.trim(), note: note.trim() });
      setName("");
      setPhone("");
      setNote("");
      setMessage(result.code ? `Saved. Pass code ${result.code}.` : "Saved.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen title="Helpers and vendors" onRefresh={load} busy={!ready && !message}>
      <Text style={ui.body}>Register domestic help, vendors, or a cab. Security checks the pass code at the gate.</Text>
      <View style={ui.card}>
        <Text style={ui.label}>Add pass</Text>
        <Chips options={KINDS} value={kind} onChange={setKind} />
        <TextInput value={name} onChangeText={setName} placeholder="Name" placeholderTextColor={colors.placeholder} style={ui.field} />
        <TextInput value={phone} onChangeText={setPhone} placeholder="Phone" keyboardType="phone-pad" placeholderTextColor={colors.placeholder} style={ui.field} />
        <TextInput value={note} onChangeText={setNote} placeholder="Note" placeholderTextColor={colors.placeholder} style={ui.field} />
        <Pressable disabled={saving} onPress={submit} style={ui.button}>
          <Text style={ui.buttonText}>{saving ? "Saving…" : "Add pass"}</Text>
        </Pressable>
      </View>
      {message ? <Note text={message} tone={/Saved|Pass code/.test(message) ? "ok" : "error"} /> : null}
      <SectionLabel title="Linked to this home" />
      {ready && people.length === 0 ? <Empty title="No helpers yet" detail="Add domestic help, a vendor, or a cab above." /> : null}
      {people.map((person) => (
        <View key={person.id} style={ui.card}>
          <Text style={ui.label}>{person.kind}{person.blacklisted ? " · blacklisted" : ""}</Text>
          <Text style={ui.cardTitle}>{person.name}</Text>
          <Text style={ui.meta}>Code {person.code}{person.phone ? ` · ${person.phone}` : ""}</Text>
        </View>
      ))}
    </Screen>
  );
}
