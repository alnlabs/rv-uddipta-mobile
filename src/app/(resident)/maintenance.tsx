import { useCallback, useState } from "react";
import { Pressable, Text } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Empty, PageTitle, SectionLabel } from "@/components/Blocks";
import { HtmlBody } from "@/components/HtmlText";
import { Loading, Screen } from "@/components/Screen";
import { loadNotices } from "@/lib/community";
import { ui } from "@/theme";

export default function MaintenanceScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Awaited<ReturnType<typeof loadNotices>>>([]);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      const notices = await loadNotices();
      setItems(notices.filter((notice) => notice.kind === "maintenance"));
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load maintenance.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen title="Maintenance" onRefresh={load}>
      <PageTitle
        kicker="Office"
        detail="Official maintenance notices for the community. Dues and receipts appear only when the office publishes a billing record for your home."
      />
      {message ? (
        <>
          <Text style={ui.error}>{message}</Text>
          <Pressable accessibilityRole="button" onPress={() => { load().catch(() => undefined); }} style={ui.button}>
            <Text style={ui.buttonText}>Try again</Text>
          </Pressable>
        </>
      ) : null}
      {!ready ? <Loading /> : null}
      {ready ? <SectionLabel title="Notices" /> : null}
      {ready && items.length === 0 ? <Empty title="No maintenance notices" detail="A shutdown or repair notice will appear here." /> : null}
      {items.map((item) => (
        <Pressable key={item.id} accessibilityRole="button" onPress={() => router.push(`/(resident)/notice/${item.id}`)} style={ui.card}>
          <Text style={ui.label}>{item.important ? "Important" : item.label} · {item.date}</Text>
          <Text style={ui.cardTitle}>{item.title}</Text>
          {item.body ? <HtmlBody html={item.body} lines={3} /> : null}
        </Pressable>
      ))}
      {ready ? <SectionLabel title="Dues and receipts" /> : null}
      {ready ? (
        <Empty
          title="No billing records"
          detail="Payment history, outstanding balances, and receipts are not available. Nothing here is marked as paid."
        />
      ) : null}
    </Screen>
  );
}
