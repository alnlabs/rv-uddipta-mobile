import { useCallback, useState } from "react";
import { Pressable, Text } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Empty, PageTitle } from "@/components/Blocks";
import { HtmlBody } from "@/components/HtmlText";
import { Loading, Screen } from "@/components/Screen";
import { loadNotices, serviceSnapshot, type ServiceLine } from "@/lib/community";
import { ui } from "@/theme";

export default function StatusScreen() {
  const router = useRouter();
  const [lines, setLines] = useState<ServiceLine[]>([]);
  const [updated, setUpdated] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      const snapshot = serviceSnapshot(await loadNotices());
      setLines(snapshot.lines);
      setUpdated(snapshot.updated);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load community status.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen title="Community status" onRefresh={load}>
      <PageTitle
        kicker="Community"
        detail="Taken from official notices. A service without a matching notice is unavailable. This does not mean it is running normally."
      />
      <Text style={ui.meta}>{updated ? `Last updated ${updated}` : "Last updated: not available"}</Text>
      {message ? (
        <>
          <Text style={ui.error}>{message}</Text>
          <Pressable accessibilityRole="button" onPress={() => { load().catch(() => undefined); }} style={ui.button}>
            <Text style={ui.buttonText}>Try again</Text>
          </Pressable>
        </>
      ) : null}
      {!ready ? <Loading /> : null}
      {lines.map((line) =>
        line.published && line.noticeId ? (
          <Pressable key={line.key} accessibilityRole="button" onPress={() => router.push(`/(resident)/notice/${line.noticeId}`)} style={ui.card}>
            <Text style={ui.label}>{line.label}{line.updated ? ` · ${line.updated}` : ""}</Text>
            <Text style={ui.cardTitle}>{line.title}</Text>
            {line.summary ? <HtmlBody html={line.summary} lines={3} /> : null}
          </Pressable>
        ) : (
          <Empty key={line.key} title={line.label} detail="Unavailable. No official update has been published." />
        ),
      )}
    </Screen>
  );
}
