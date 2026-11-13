import { useCallback, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Banner, Empty, Panel, SectionLabel } from "@/components/Blocks";
import { Screen } from "@/components/Screen";
import {
  decideBooking,
  loadAmenities,
  saveAmenityHours,
  type AmenityBooking,
} from "@/lib/office";
import { planDayLabel } from "@/lib/day";
import { colors, ui } from "@/theme";

export default function BookingsScreen() {
  const [pending, setPending] = useState<AmenityBooking[]>([]);
  const [amenities, setAmenities] = useState<{ id: number; name: string; hours: string }[]>([]);
  const [hoursDraft, setHoursDraft] = useState<Record<number, string>>({});
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"error" | "ok">("error");
  const [ready, setReady] = useState(false);
  const [busyId, setBusyId] = useState<number | string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await loadAmenities();
      if (!data.canDecide) throw new Error("Booking confirmations are for the office.");
      setPending(data.pending ?? []);
      setAmenities(data.amenities);
      setHoursDraft(Object.fromEntries(data.amenities.map((item) => [item.id, item.hours])));
      setMessage("");
    } catch (error) {
      setPending([]);
      setAmenities([]);
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Could not load bookings.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function decide(bookingId: number, status: "confirmed" | "refused") {
    if (busyId) return;
    setBusyId(bookingId);
    setMessage("");
    try {
      const result = await decideBooking({ bookingId, status });
      setTone("ok");
      setMessage(result.message);
      await load();
    } catch (error) {
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Could not update that booking.");
    } finally {
      setBusyId(null);
    }
  }

  function askDecide(row: AmenityBooking, status: "confirmed" | "refused") {
    if (status === "refused") {
      Alert.alert("Refuse this booking?", `${row.space} · ${planDayLabel(row.when) || row.when} · ${row.slot}`, [
        { text: "Cancel", style: "cancel" },
        { text: "Refuse", style: "destructive", onPress: () => decide(row.id, "refused") },
      ]);
      return;
    }
    decide(row.id, "confirmed");
  }

  async function saveHours(amenityId: number) {
    if (busyId) return;
    setBusyId(`hours-${amenityId}`);
    setMessage("");
    try {
      const result = await saveAmenityHours({ amenityId, hours: hoursDraft[amenityId] ?? "" });
      setTone("ok");
      setMessage(result.message);
      await load();
    } catch (error) {
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Could not save hours.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Screen title="Amenity bookings" onRefresh={load} busy={!ready && !message}>
      <Text style={ui.body}>Confirm or refuse pending bookings for shared spaces.</Text>
      {message ? <Banner text={message} tone={tone} /> : null}
      {ready && pending.length === 0 ? (
        <Empty title="No bookings waiting" detail="When someone books a space, it shows up here for confirmation." />
      ) : null}
      {pending.map((row) => {
        const busy = busyId === row.id;
        return (
          <Panel key={row.id}>
            <Text style={ui.label}>{row.space}{row.overdue ? " · Past date" : ""}</Text>
            <Text style={ui.cardTitle}>{row.who || row.home || "Resident"}</Text>
            <Text style={ui.body}>{planDayLabel(row.when) || row.when} · {row.slot}</Text>
            {row.home ? <Text style={ui.meta}>{row.home}</Text> : null}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              <Pressable disabled={Boolean(busyId)} onPress={() => askDecide(row, "confirmed")} style={[ui.button, { flex: 1 }]}>
                <Text style={ui.buttonText}>{busy ? "Saving…" : "Confirm"}</Text>
              </Pressable>
              <Pressable
                disabled={Boolean(busyId)}
                onPress={() => askDecide(row, "refused")}
                style={[ui.button, { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.button }]}
              >
                <Text style={[ui.buttonText, { color: colors.button }]}>Refuse</Text>
              </Pressable>
            </View>
          </Panel>
        );
      })}

      {amenities.length ? <SectionLabel title="Hours" /> : null}
      {amenities.map((item) => (
        <Panel key={item.id}>
          <Text style={ui.cardTitle}>{item.name}</Text>
          <TextInput
            value={hoursDraft[item.id] ?? ""}
            onChangeText={(value) => setHoursDraft((current) => ({ ...current, [item.id]: value }))}
            placeholder="Hours note"
            placeholderTextColor={colors.placeholder}
            style={[ui.field, { backgroundColor: colors.page, borderWidth: 0 }]}
          />
          <Pressable
            disabled={Boolean(busyId)}
            onPress={() => saveHours(item.id)}
            style={[ui.button, { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.button }]}
          >
            <Text style={[ui.buttonText, { color: colors.button }]}>
              {busyId === `hours-${item.id}` ? "Saving…" : "Save hours"}
            </Text>
          </Pressable>
        </Panel>
      ))}
    </Screen>
  );
}
