import { useCallback, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Back, Loading, Note, Screen } from "@/components/Screen";
import { loadParking, removeVehicle, saveVehicle } from "@/lib/office";
import { colors, ui } from "@/theme";

export default function ParkingScreen() {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadParking>> | null>(null);
  const [plate, setPlate] = useState("");
  const [label, setLabel] = useState("Car");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await loadParking());
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load parking.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function add() {
    if (saving) return;
    setSaving(true);
    setMessage("");
    try {
      const result = await saveVehicle({ plate, label });
      setPlate("");
      setMessage(result.message || "Vehicle added.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add the vehicle.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (saving) return;
    setSaving(true);
    try {
      await removeVehicle(id);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove that.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen onRefresh={load}>
      <Back />
      <Text style={ui.eyebrow}>Home</Text>
      <Text style={ui.title}>Parking</Text>
      <Text style={ui.body}>{data?.home ? `Vehicles for ${data.home}.` : "Link a home to save your vehicles."}</Text>
      {!ready ? <Loading /> : null}
      {(data?.vehicles ?? []).map((item) => (
        <View key={item.id} style={ui.card}>
          <Text style={ui.cardTitle}>{item.plate}</Text>
          <Text style={ui.body}>{item.label}</Text>
          {data?.canManage ? (
            <Pressable onPress={() => remove(item.id)} style={ui.quiet}>
              <Text style={ui.quietText}>Remove</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
      {ready && (data?.vehicles.length ?? 0) === 0 ? <Text style={ui.body}>No vehicles saved yet.</Text> : null}
      {data?.canManage ? (
        <View style={ui.card}>
          <Text style={ui.label}>Add vehicle</Text>
          <TextInput value={plate} onChangeText={setPlate} autoCapitalize="characters" placeholder="Number plate" placeholderTextColor={colors.placeholder} style={ui.field} />
          <TextInput value={label} onChangeText={setLabel} placeholder="Label, for example Car or Bike" placeholderTextColor={colors.placeholder} style={ui.field} />
          <Pressable disabled={saving} onPress={add} style={ui.button}>
            <Text style={ui.buttonText}>{saving ? "Saving…" : "Save vehicle"}</Text>
          </Pressable>
        </View>
      ) : null}
      <Text style={ui.label}>Bays</Text>
      {(data?.bays ?? []).map((bay) => (
        <View key={bay.id} style={ui.card}>
          <Text style={ui.cardTitle}>{bay.label}</Text>
          <Text style={ui.body}>{bay.kind === "visitor" ? "Visitor bay" : bay.home ? `Home ${bay.home}` : "Resident bay"}</Text>
        </View>
      ))}
      {message ? <Note text={message} /> : null}
    </Screen>
  );
}
