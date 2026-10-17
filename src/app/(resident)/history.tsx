import { useCallback, useState } from "react";
import { Pressable, Text } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { TextButton } from "@/components/Blocks";
import { Loading, Note, Screen } from "@/components/Screen";
import { loadPasses } from "@/lib/community";
import { ui } from "@/theme";

export default function HistoryScreen() {
  const router = useRouter();
  const [passes, setPasses] = useState<Awaited<ReturnType<typeof loadPasses>>["passes"]>([]);
  const [canCreate, setCanCreate] = useState(false);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await loadPasses();
      setPasses(data.passes);
      setCanCreate(data.canCreate);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load visitor history.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen
      title="Visitors"
      onRefresh={load}
      action={canCreate ? <TextButton label="Invite" onPress={() => router.push("/(resident)/invite")} /> : undefined}
    >
      {message ? <Note text={message} /> : null}
      {!ready ? <Loading /> : null}
      {ready && passes.length === 0 ? <Text style={ui.body}>No passes yet.</Text> : null}
      {passes.map((pass) => (
        <Pressable key={pass.id} onPress={() => router.push(`/(resident)/pass/${pass.id}`)} style={ui.card}>
          <Text style={ui.label}>{pass.status} · {pass.date}</Text>
          <Text style={ui.cardTitle}>{pass.name}</Text>
          <Text style={ui.body}>{pass.code} · {pass.home}</Text>
        </Pressable>
      ))}
    </Screen>
  );
}
