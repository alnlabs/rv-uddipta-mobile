import { useCallback, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Note, Screen } from "@/components/Screen";
import { loadDeliveries, recordDelivery } from "@/lib/community";
import { colors, ui } from "@/theme";

export default function DeliveriesScreen() {
  const router = useRouter();
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
      const told = await recordDelivery(home, label);
      setHome("");
      setLabel("");
      await load();
      setMessage(told ? "The resident has been told." : "Saved. That home has nobody to tell.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "That delivery was not recorded.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen onRefresh={load} busy={!ready && !message}>
      <Text style={ui.eyebrow}>Gate</Text>
      <Text style={ui.title}>Deliveries</Text>
      <Text style={ui.body}>Use the phone for delivery people at the gate. Leave parcels here only when nobody is going up.</Text>

      <Text style={ui.label}>Delivery person</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={() => router.push("/(security)/scan")} style={[ui.button, { flex: 1 }]}>
          <Text style={ui.buttonText}>Scan QR</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/(security)/walk-in?purpose=Delivery")}
          style={[ui.button, { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.button }]}
        >
          <Text style={[ui.buttonText, { color: colors.button }]}>No pass</Text>
        </Pressable>
      </View>

      <Text style={ui.label}>Parcel left at gate</Text>
      <View style={ui.card}>
        <TextInput value={home} onChangeText={setHome} autoCapitalize="characters" placeholder="Home, A-101" placeholderTextColor={colors.placeholder} style={ui.field} />
        <TextInput value={label} onChangeText={setLabel} placeholder="What arrived" placeholderTextColor={colors.placeholder} style={ui.field} />
        <Pressable onPress={save} disabled={saving} style={ui.button}>
          <Text style={ui.buttonText}>{saving ? "Saving…" : "Record parcel"}</Text>
        </Pressable>
      </View>
      {message ? <Note text={message} tone={message.startsWith("The resident") ? "ok" : "error"} /> : null}
      {ready && rows.length === 0 ? <Text style={ui.body}>No parcels recorded.</Text> : null}
      {rows.map((row) => (
        <View key={row.id} style={ui.card}>
          <Text style={ui.label}>{row.status === "collected" ? "Collected" : row.status === "held" ? "Nobody told" : "Resident told"}</Text>
          <Text style={ui.cardTitle}>{row.label}</Text>
          <Text style={ui.body}>{row.flat_number}</Text>
        </View>
      ))}
    </Screen>
  );
}
