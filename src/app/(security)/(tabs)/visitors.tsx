import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Note, Screen } from "@/components/Screen";
import { loadGatePasses } from "@/lib/community";
import { colors, ui } from "@/theme";

const GROUPS = [
  ["waiting", "At the gate"],
  ["pending", "Waiting for the resident"],
  ["expected", "Expected today"],
  ["inside", "Inside"],
  ["left", "Left"],
  ["refused", "Refused or cancelled"],
] as const;

export default function GateVisitorsScreen() {
  const router = useRouter();
  const [groups, setGroups] = useState<Awaited<ReturnType<typeof loadGatePasses>> | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      setGroups(await loadGatePasses());
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load visitors.");
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen onRefresh={load} busy={!groups && !message}>
      <Text style={ui.eyebrow}>Gate</Text>
      <Text style={ui.title}>Visitors</Text>
      <Text style={ui.body}>Guests and delivery people handled on this phone.</Text>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}>
        <Pressable onPress={() => router.push("/(security)/scan")} style={[ui.button, { flex: 1 }]}>
          <Text style={ui.buttonText}>Scan QR</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/(security)/walk-in")}
          style={[ui.button, { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.button }]}
        >
          <Text style={[ui.buttonText, { color: colors.button }]}>No pass</Text>
        </Pressable>
      </View>
      {message ? <Note text={message} /> : null}
      {GROUPS.map(([key, title]) => {
        const rows = groups?.[key] ?? [];
        if (!rows.length) return null;
        return rows.map((pass, index) => (
          <Pressable
            key={pass.id}
            onPress={() => router.push(`/(security)/check?code=${encodeURIComponent(String(pass.code))}`)}
            style={ui.card}
          >
            {index === 0 ? <Text style={ui.label}>{title}</Text> : null}
            <Text style={ui.cardTitle}>{pass.visitor_name}</Text>
            <Text style={ui.body}>
              {pass.flat_number} · {pass.code}
              {pass.purpose ? ` · ${pass.purpose}` : ""} · {pass.visit_on}
            </Text>
          </Pressable>
        ));
      })}
      {groups && GROUPS.every(([key]) => groups[key].length === 0) ? <Text style={ui.body}>No visitor records.</Text> : null}
    </Screen>
  );
}
