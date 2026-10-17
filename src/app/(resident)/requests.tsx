import { useCallback, useState } from "react";
import { Pressable, Text } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Loading, Note, Screen } from "@/components/Screen";
import { loadRequests } from "@/lib/community";
import { ui } from "@/theme";

export default function RequestsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Awaited<ReturnType<typeof loadRequests>>["requests"]>([]);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems((await loadRequests()).requests);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load requests.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen title="Complaints" onRefresh={load}>
      {message ? <Note text={message} /> : null}
      {!ready ? <Loading /> : null}
      {ready && items.length === 0 ? <Text style={ui.body}>No complaints yet.</Text> : null}
      {items.map((item) => (
        <Pressable key={item.id} accessibilityRole="button" onPress={() => router.push(`/(resident)/request/${item.id}`)} style={ui.card}>
          <Text style={ui.label}>{item.category} · {item.status}</Text>
          <Text style={ui.cardTitle}>{item.body}</Text>
          <Text style={ui.meta}>{item.date}</Text>
        </Pressable>
      ))}
    </Screen>
  );
}
