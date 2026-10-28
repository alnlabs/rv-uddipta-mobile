import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Back, Loading, Note, Screen } from "@/components/Screen";
import { bookAmenity, loadAmenities } from "@/lib/office";
import { colors, ui } from "@/theme";

function dayOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function dayLabel(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function AmenitiesScreen() {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadAmenities>> | null>(null);
  const [amenityId, setAmenityId] = useState<number | null>(null);
  const [startsOn, setStartsOn] = useState(dayOffset(0));
  const [slot, setSlot] = useState("");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const next = await loadAmenities();
      setData(next);
      setAmenityId((current) => current ?? next.amenities[0]?.id ?? null);
      setSlot((current) => current || next.slots[0]?.value || "");
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load amenities.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function book() {
    if (!amenityId || saving) return;
    setSaving(true);
    setMessage("");
    try {
      const result = await bookAmenity({ amenityId, startsOn, slot });
      setMessage(result.message);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not book that.");
    } finally {
      setSaving(false);
    }
  }

  const dates = [0, 1, 2, 3, 4, 5, 6].map(dayOffset);

  return (
    <Screen onRefresh={load}>
      <Back />
      <Text style={ui.eyebrow}>Services</Text>
      <Text style={ui.title}>Amenities</Text>
      <Text style={ui.body}>Book a shared space. The office confirms the slot.</Text>
      {!ready ? <Loading /> : null}
      {data?.mine.length ? <Text style={ui.label}>Your bookings</Text> : null}
      {data?.mine.map((item) => (
        <View key={item.id} style={ui.card}>
          <Text style={ui.label}>{item.status}</Text>
          <Text style={ui.cardTitle}>{item.space}</Text>
          <Text style={ui.body}>{dayLabel(item.when)} · {item.slot}</Text>
        </View>
      ))}
      {data?.canBook ? (
        <View style={ui.card}>
          <Text style={ui.label}>New booking</Text>
          {(data.amenities ?? []).map((item) => (
            <Pressable key={item.id} onPress={() => setAmenityId(item.id)} style={[ui.quiet, amenityId === item.id ? { backgroundColor: colors.brandSoft } : null]}>
              <Text style={ui.quietText}>{item.name}{item.hours ? ` · ${item.hours}` : ""}</Text>
            </Pressable>
          ))}
          <Text style={ui.label}>Day</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {dates.map((day) => (
              <Pressable key={day} onPress={() => setStartsOn(day)} style={[ui.button, { paddingVertical: 10, backgroundColor: startsOn === day ? colors.button : colors.white, borderWidth: 1, borderColor: colors.button }]}>
                <Text style={[ui.buttonText, { fontSize: 13, color: startsOn === day ? colors.onButton : colors.button }]}>{dayLabel(day)}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={ui.label}>Time</Text>
          {(data.slots ?? []).map((item) => (
            <Pressable key={item.value} onPress={() => setSlot(item.value)} style={[ui.quiet, slot === item.value ? { backgroundColor: colors.brandSoft } : null]}>
              <Text style={ui.quietText}>{item.label}</Text>
            </Pressable>
          ))}
          <Pressable disabled={saving} onPress={book} style={ui.button}>
            <Text style={ui.buttonText}>{saving ? "Sending…" : "Request booking"}</Text>
          </Pressable>
        </View>
      ) : ready ? (
        <Text style={ui.body}>Booking needs a linked home.</Text>
      ) : null}
      {message ? <Note text={message} /> : null}
    </Screen>
  );
}
