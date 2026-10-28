import { useCallback, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Empty } from "@/components/Blocks";
import { HtmlBody } from "@/components/HtmlText";
import { Loading, Note, Screen } from "@/components/Screen";
import {
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationPath,
} from "@/lib/community";
import { setAppBadge } from "@/lib/notify";
import { colors, ui } from "@/theme";

type Tab = "all" | "alerts" | "messages";

function tabFor(kind: string, href: string): Exclude<Tab, "all"> {
  const value = `${kind} ${href}`.toLowerCase();
  if (
    value.includes("visitor")
    || value.includes("pass")
    || value.includes("delivery")
    || value.includes("notice")
    || value.includes("announce")
    || value.includes("registration")
    || value.includes("task")
    || value.includes("work")
  ) {
    return "alerts";
  }
  return "messages";
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Awaited<ReturnType<typeof loadNotifications>>>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await loadNotifications();
      setItems(rows);
      setAppBadge(rows.filter((item) => !item.read).length).catch(() => undefined);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load notifications.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const visible = useMemo(() => {
    if (tab === "all") return items;
    return items.filter((item) => tabFor(item.kind, item.href) === tab);
  }, [items, tab]);

  async function markAll() {
    try {
      await markAllNotificationsRead();
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not mark all as read.");
    }
  }

  return (
    <Screen title="Inbox" onRefresh={load}>
      <Text style={ui.body}>Announcements, complaint updates, visitors, and events that were sent to you.</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {([
          ["all", "All"],
          ["alerts", "Alerts"],
          ["messages", "Messages"],
        ] as const).map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setTab(key)}
            style={[ui.button, { flex: 1, paddingVertical: 10, backgroundColor: tab === key ? colors.button : colors.white, borderWidth: 1, borderColor: colors.button }]}
          >
            <Text style={[ui.buttonText, { fontSize: 13, color: tab === key ? colors.onButton : colors.button }]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {items.some((item) => !item.read) ? (
        <Pressable onPress={markAll} style={ui.quiet}>
          <Text style={ui.quietText}>Mark all as read</Text>
        </Pressable>
      ) : null}
      {message ? <Note text={message} /> : null}
      {!ready ? <Loading /> : null}
      {ready && visible.length === 0 ? (
        <Empty title="Nothing in this tab" detail="New alerts will appear here. Pull to refresh." />
      ) : null}
      {visible.map((item) => (
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
