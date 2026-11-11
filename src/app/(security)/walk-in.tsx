import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Note, Screen } from "@/components/Screen";
import { walkInVisitor } from "@/lib/office";
import { colors, ui } from "@/theme";

const PURPOSES = ["Guest", "Delivery", "Cab / ride", "Service"] as const;

function normalizePurpose(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const next = String(raw || "").trim();
  if (!next) return "Guest";
  const hit = PURPOSES.find((item) => item.toLowerCase() === next.toLowerCase());
  return hit || next;
}

export default function WalkInScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ purpose?: string }>();
  const initialPurpose = useMemo(() => normalizePurpose(params.purpose), [params.purpose]);
  const [visitorName, setVisitorName] = useState("");
  const [flatNumber, setFlatNumber] = useState("");
  const [purpose, setPurpose] = useState(initialPurpose);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const delivery = purpose.toLowerCase().includes("deliver");

  async function submit() {
    if (saving) return;
    setSaving(true);
    setMessage("");
    try {
      const result = await walkInVisitor({ visitorName, flatNumber, purpose });
      router.replace(`/(security)/check?code=${encodeURIComponent(result.code)}&walkin=1`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not log the walk-in.");
      setSaving(false);
    }
  }

  return (
    <Screen title={delivery ? "Delivery person" : "Unplanned guest"}>
      <Text style={ui.body}>
        {delivery
          ? "No QR. Tell the home a delivery person is waiting. Wait for their answer before letting them up."
          : "No QR pass. Notify the home — they must allow entry before you open the gate."}
      </Text>
      <View style={ui.card}>
        <TextInput
          value={visitorName}
          onChangeText={setVisitorName}
          placeholder={delivery ? "Courier / company name" : "Visitor name"}
          placeholderTextColor={colors.placeholder}
          style={ui.field}
        />
        <TextInput
          value={flatNumber}
          onChangeText={setFlatNumber}
          autoCapitalize="characters"
          placeholder="Home, for example A101"
          placeholderTextColor={colors.placeholder}
          style={ui.field}
        />
        <Text style={ui.label}>Why they came</Text>
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
        <TextInput
          value={purpose}
          onChangeText={setPurpose}
          placeholder="Or type a short reason"
          placeholderTextColor={colors.placeholder}
          style={ui.field}
        />
        <Pressable disabled={saving} onPress={submit} style={ui.button}>
          <Text style={ui.buttonText}>{saving ? "Notifying home…" : "Notify home"}</Text>
        </Pressable>
      </View>
      {message ? <Note text={message} /> : null}
    </Screen>
  );
}
