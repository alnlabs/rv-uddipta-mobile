import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Empty } from "@/components/Blocks";
import { Note, Screen } from "@/components/Screen";
import { ackCircular, loadMyCirculars, type CircularItem } from "@/lib/business";
import { ui } from "@/theme";

export default function CircularsScreen() {
  const [items, setItems] = useState<CircularItem[]>([]);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await loadMyCirculars());
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load circulars.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function ack(id: number) {
    if (saving) return;
    setSaving(true);
    try {
      await ackCircular(id);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not acknowledge.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen title="Circulars" onRefresh={load} busy={!ready && !message}>
      <Text style={ui.body}>Official circulars. Acknowledge once you have read them.</Text>
      {message ? <Note text={message} /> : null}
      {ready && items.length === 0 ? <Empty title="No circulars" detail="When the committee publishes one, it appears here." /> : null}
      {items.map((item) => (
        <View key={item.id} style={ui.card}>
          <Text style={ui.cardTitle}>{item.title}</Text>
          <Text style={ui.body}>{item.body}</Text>
          {item.read ? (
            <Text style={ui.meta}>Acknowledged</Text>
          ) : (
            <Pressable disabled={saving} onPress={() => ack(item.id)} style={ui.button}>
              <Text style={ui.buttonText}>I have read this</Text>
            </Pressable>
          )}
        </View>
      ))}
    </Screen>
  );
}
