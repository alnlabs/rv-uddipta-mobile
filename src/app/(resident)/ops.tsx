import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Empty } from "@/components/Blocks";
import { Note, Screen } from "@/components/Screen";
import { loadBuildingOps, type OpsItem } from "@/lib/business";
import { ui } from "@/theme";

export default function OpsScreen() {
  const [items, setItems] = useState<OpsItem[]>([]);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await loadBuildingOps());
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load building ops.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen title="Building ops" onRefresh={load} busy={!ready && !message}>
      <Text style={ui.body}>Open outages and building status notes from the office.</Text>
      {message ? <Note text={message} /> : null}
      {ready && items.length === 0 ? <Empty title="All clear" detail="Nothing open right now." /> : null}
      {items.map((item) => (
        <View key={item.id} style={ui.card}>
          <Text style={ui.label}>{item.kind}</Text>
          <Text style={ui.cardTitle}>{item.title}</Text>
          {item.body ? <Text style={ui.body}>{item.body}</Text> : null}
        </View>
      ))}
    </Screen>
  );
}
