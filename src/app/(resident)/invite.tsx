import { useMemo, useState } from "react";
import { Pressable, Share, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Note, Screen } from "@/components/Screen";
import { createPass, loadPasses } from "@/lib/community";
import { passShareMessage, passShareUrl } from "@/lib/site";
import { indiaDay, planDayLabel } from "@/lib/day";
import { colors, ui } from "@/theme";

function dayOffset(days: number) {
  return indiaDay(days);
}

const PURPOSES = ["Guest", "Delivery", "Family", "Service"] as const;

export default function InviteScreen() {
  const router = useRouter();
  const dates = useMemo(() => [0, 1, 2, 3, 4, 5, 6].map(dayOffset), []);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [purpose, setPurpose] = useState<string>("Guest");
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
          date: planDayLabel(created.date) || created.date,
        });
        await Share.share({ message: text, url: passShareUrl(created.code) }).catch(() => undefined);
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
      <Text style={ui.body}>Creates a visitor pass. After create, share the text link — the guest opens it to show a QR at the gate. They do not get an account.</Text>
      <View style={ui.card}>
        <TextInput value={name} onChangeText={setName} placeholder="Visitor name" placeholderTextColor={colors.placeholder} style={ui.field} />
        <TextInput value={phone} onChangeText={setPhone} placeholder="Phone" placeholderTextColor={colors.placeholder} style={ui.field} keyboardType="phone-pad" />
        <Text style={ui.label}>Why they are coming</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {PURPOSES.map((item) => {
            const on = purpose === item;
            return (
              <Pressable
                key={item}
                onPress={() => setPurpose(item)}
                style={[ui.button, { paddingVertical: 10, backgroundColor: on ? colors.button : colors.white, borderWidth: 1, borderColor: colors.button }]}
              >
                <Text style={[ui.buttonText, { fontSize: 13, color: on ? colors.onButton : colors.button }]}>{item}</Text>
              </Pressable>
            );
          })}
        </View>
        <TextInput value={purpose} onChangeText={setPurpose} placeholder="Or type a short reason" placeholderTextColor={colors.placeholder} style={ui.field} />
        <Text style={ui.label}>Visit day</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {dates.map((day) => (
            <Pressable
              key={day}
              onPress={() => setVisitOn(day)}
              style={[ui.button, { paddingVertical: 10, backgroundColor: visitOn === day ? colors.button : colors.white, borderWidth: 1, borderColor: colors.button }]}
            >
              <Text style={[ui.buttonText, { fontSize: 13, color: visitOn === day ? colors.onButton : colors.button }]}>{planDayLabel(day)}</Text>
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
