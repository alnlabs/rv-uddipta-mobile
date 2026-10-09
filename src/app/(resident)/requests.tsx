import { useCallback, useState } from "react";
import { Pressable, Text } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Back, Loading, Note, Screen } from "@/components/Screen";
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
    <Screen onRefresh={load}>
      <Back />
      <Text style={ui.eyebrow}>Office</Text>
      <Text style={ui.title}>My requests</Text>
      {message ? <Note text={message} /> : null}
      {!ready ? <Loading /> : null}
      {ready && items.length === 0 ? <Text style={ui.body}>No requests yet.</Text> : null}
      {items.map((item) => (
        <Pressable key={item.id} onPress={() => router.push(`/(resident)/request/${item.id}`)} style={ui.card}>
          <Text style={ui.label}>{item.status} · {item.date}</Text>
          <Text style={ui.cardTitle}>{item.body}</Text>
        </Pressable>
      ))}
    </Screen>
  );
}
