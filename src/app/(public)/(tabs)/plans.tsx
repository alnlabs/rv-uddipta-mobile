import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Note, Screen } from "@/components/Screen";
import { loadBrochureFlats } from "@/lib/brochure";
import { ui } from "@/theme";

export default function PublicPlansScreen() {
  const [flats, setFlats] = useState<Awaited<ReturnType<typeof loadBrochureFlats>>>([]);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      setFlats(await loadBrochureFlats());
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load homes.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen title="Homes" showBack={false} onRefresh={load} busy={!ready && !message}>
      <Text style={ui.body}>Brochure homes from the inventory. Sample list while you wait for access.</Text>
      {flats.map((flat) => (
        <View key={flat.flatNumber} style={ui.card}>
          <Text style={ui.heading}>{flat.flatNumber}</Text>
          <Text style={ui.body}>
            Floor {flat.floor} · Wing {flat.wing || "—"} · {flat.type || "Flat"}
            {flat.areaSqft ? ` · ${flat.areaSqft.toLocaleString()} sft` : ""}
          </Text>
        </View>
      ))}
      {ready && flats.length === 0 ? <Note text="No brochure homes to show yet." /> : null}
      {message ? <Note text={message} /> : null}
    </Screen>
  );
}
