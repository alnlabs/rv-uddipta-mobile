import { useCallback, useState } from "react";
import { Pressable, Text } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Note, Screen } from "@/components/Screen";
import { loadGatePasses } from "@/lib/community";
import { ui } from "@/theme";

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
    <Screen title="Visitors" showBack={false} onRefresh={load} busy={!groups && !message}>
      <Text style={ui.body}>Guests and delivery people handled on this phone.</Text>
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
