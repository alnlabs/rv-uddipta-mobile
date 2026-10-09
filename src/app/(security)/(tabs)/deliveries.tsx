import { useCallback, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Loading, Note, Screen } from "@/components/Screen";
import { loadDeliveries, recordDelivery } from "@/lib/community";
import { colors, ui } from "@/theme";

export default function DeliveriesScreen() {
  const [home, setHome] = useState("");
  const [label, setLabel] = useState("");
  const [rows, setRows] = useState<Awaited<ReturnType<typeof loadDeliveries>>>([]);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await loadDeliveries());
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load deliveries.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function save() {
    if (saving) return;
    setSaving(true);
    setMessage("");
    try {
      await recordDelivery(home, label);
      setHome("");
      setLabel("");
      await load();
      setMessage("The resident has been told.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "That delivery was not recorded.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen onRefresh={load}>
      <Text style={ui.eyebrow}>Gate</Text>
      <Text style={ui.title}>Deliveries</Text>
      <View style={ui.card}>
        <TextInput value={home} onChangeText={setHome} autoCapitalize="characters" placeholder="Home, A-101" placeholderTextColor={colors.placeholder} style={ui.field} />
        <TextInput value={label} onChangeText={setLabel} placeholder="What arrived" placeholderTextColor={colors.placeholder} style={ui.field} />
        <Pressable onPress={save} disabled={saving} style={ui.button}>
          <Text style={ui.buttonText}>{saving ? "Saving…" : "Record delivery"}</Text>
        </Pressable>
      </View>
      {message ? <Note text={message} tone={message.endsWith("told.") ? "ok" : "error"} /> : null}
      {!ready ? <Loading /> : null}
      {ready && rows.length === 0 ? <Text style={ui.body}>No deliveries recorded.</Text> : null}
      {rows.map((row) => (
        <View key={row.id} style={ui.card}>
          <Text style={ui.label}>{row.status === "collected" ? "Collected" : "Resident told"}</Text>
          <Text style={ui.cardTitle}>{row.label}</Text>
          <Text style={ui.body}>{row.flat_number}</Text>
        </View>
      ))}
    </Screen>
  );
}
