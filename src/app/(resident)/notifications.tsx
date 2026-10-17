import { useCallback, useState } from "react";
import { Pressable, Text } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Empty } from "@/components/Blocks";
import { HtmlBody } from "@/components/HtmlText";
import { Loading, Note, Screen } from "@/components/Screen";
import { loadNotifications, markNotificationRead, notificationPath } from "@/lib/community";
import { colors, ui } from "@/theme";

export default function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Awaited<ReturnType<typeof loadNotifications>>>([]);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await loadNotifications());
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load notifications.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen title="Notifications" onRefresh={load}>
      <Text style={ui.body}>Announcements, complaint updates, visitors, and events that were sent to you.</Text>
      {message ? <Note text={message} /> : null}
      {!ready ? <Loading /> : null}
      {ready && items.length === 0 ? <Empty title="No notifications" detail="New alerts will appear here. Pull to refresh." /> : null}
      {items.map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          accessibilityLabel={item.title}
          onPress={async () => {
            await markNotificationRead(item.id);
            const path = notificationPath(item.kind, item.href);
            if (path) router.push(path as never);
            else load();
          }}
          style={[ui.card, item.read ? null : { borderColor: colors.gold }]}
        >
          <Text style={ui.label}>{item.read ? item.date : `Unread · ${item.date}`}</Text>
          <Text style={ui.cardTitle}>{item.title}</Text>
          {item.body ? <HtmlBody html={item.body} /> : null}
        </Pressable>
      ))}
    </Screen>
  );
}
