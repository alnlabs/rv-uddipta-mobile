import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Back, Loading, Note, Screen } from "@/components/Screen";
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
    <Screen onRefresh={load}>
      <Back />
      <Text style={ui.eyebrow}>Account</Text>
      <Text style={ui.title}>Notifications</Text>
      {message ? <Note text={message} /> : null}
      {!ready ? <Loading /> : null}
      {ready && items.length === 0 ? <Text style={ui.body}>No notifications yet.</Text> : null}
      {items.map((item) => (
        <Pressable
          key={item.id}
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
          {item.body ? <Text style={ui.body}>{item.body}</Text> : null}
        </Pressable>
      ))}
    </Screen>
  );
}
