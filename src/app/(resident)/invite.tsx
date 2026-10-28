import { useMemo, useState } from "react";
import { Pressable, Share, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Note, Screen } from "@/components/Screen";
import { createPass, loadPasses } from "@/lib/community";
import { passShareMessage } from "@/lib/site";
import { colors, ui } from "@/theme";

function dayOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function dayLabel(value: string) {
  const today = dayOffset(0);
  const tomorrow = dayOffset(1);
  if (value === today) return "Today";
  if (value === tomorrow) return "Tomorrow";
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function InviteScreen() {
  const router = useRouter();
  const dates = useMemo(() => [0, 1, 2, 3, 4, 5, 6].map(dayOffset), []);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [purpose, setPurpose] = useState("");
  const [visitOn, setVisitOn] = useState(dates[0]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (saving) return;
    setSaving(true);
    setMessage("");
    try {
      const code = await createPass({ visitorName: name, phone, purpose, visitOn });
      const data = await loadPasses();
      const created = data.passes.find((pass) => pass.code === code) ?? data.passes[0];
      if (created) {
        const text = passShareMessage({
          code: created.code,
          visitorName: created.name,
          home: created.home,
          date: created.date,
        });
        await Share.share({ message: text }).catch(() => undefined);
        router.replace(`/(resident)/pass/${created.id}`);
      } else {
        setMessage("Pass created. Open visitor history to see it.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create the pass.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen title="Invite a visitor">
      <Text style={ui.body}>They show the pass at the gate. They do not get an account. After create, you can share on WhatsApp.</Text>
      <View style={ui.card}>
        <TextInput value={name} onChangeText={setName} placeholder="Visitor name" placeholderTextColor={colors.placeholder} style={ui.field} />
        <TextInput value={phone} onChangeText={setPhone} placeholder="Phone" placeholderTextColor={colors.placeholder} style={ui.field} keyboardType="phone-pad" />
        <TextInput value={purpose} onChangeText={setPurpose} placeholder="Why they are coming" placeholderTextColor={colors.placeholder} style={ui.field} />
        <Text style={ui.label}>Visit day</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {dates.map((day) => (
            <Pressable
              key={day}
              onPress={() => setVisitOn(day)}
              style={[ui.button, { paddingVertical: 10, backgroundColor: visitOn === day ? colors.button : colors.white, borderWidth: 1, borderColor: colors.button }]}
            >
              <Text style={[ui.buttonText, { fontSize: 13, color: visitOn === day ? colors.onButton : colors.button }]}>{dayLabel(day)}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={submit} disabled={saving} style={ui.button}>
          <Text style={ui.buttonText}>{saving ? "Creating…" : "Create pass"}</Text>
        </Pressable>
      </View>
      {message ? <Note text={message} tone={message.startsWith("Pass created") ? "ok" : "error"} /> : null}
    </Screen>
  );
}
