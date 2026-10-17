import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Empty, SectionLabel } from "@/components/Blocks";
import { HtmlBody } from "@/components/HtmlText";
import { type IconName } from "@/components/Icon";
import { RoleSwitch } from "@/components/RoleSwitch";
import { Loading, Note, Screen, Tile } from "@/components/Screen";
import { loadAccount, loadAttention } from "@/lib/community";
import { loadMyUpcomingEvents, type FeedPost } from "@/lib/feed";
import { type Account } from "@/lib/place";
import { useSession } from "@/lib/session";
import { colors, ui } from "@/theme";

type Attention = Awaited<ReturnType<typeof loadAttention>>;

export default function HomeScreen() {
  const { session } = useSession();
  const router = useRouter();
  const [home, setHome] = useState<Account | null>(null);
  const [attention, setAttention] = useState<Attention | null>(null);
  const [events, setEvents] = useState<FeedPost[]>([]);
  const [message, setMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      const [account, today, registered] = await Promise.all([
        loadAccount(),
        loadAttention(),
        loadMyUpcomingEvents().catch(() => [] as FeedPost[]),
      ]);
      setHome(account);
      setAttention(today);
      setEvents(registered);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load your home.");
    }
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const visitors = attention?.waitingVisitors ?? [];
  const replies = attention?.waitingRequests ?? [];
  const notices = attention?.notices ?? [];
  const openComplaints = attention?.openRequests ?? [];
  const canComplain = Boolean(home && home.role !== "visitor");
  const activityQuiet = openComplaints.length === 0 && events.length === 0;

  const actions: { icon: IconName; label: string; href: string }[] = [
    { icon: "schedule", label: "Maintenance", href: "/(resident)/maintenance" },
    ...(canComplain ? [{ icon: "form" as const, label: "Raise complaint", href: "/(resident)/request/new" }] : []),
    { icon: "bell", label: "Announcements", href: "/(resident)/notices" },
    { icon: "floors", label: "Community status", href: "/(resident)/status" },
    { icon: "people", label: "Visitors", href: "/(resident)/history" },
    { icon: "feed", label: "Events", href: "/(resident)/events" },
  ];

  return (
    <Screen underHeader refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}>
      {home ? <Text style={ui.heading}>{home.greeting}</Text> : null}
      <RoleSwitch roles={home?.roles ?? []} active={home?.role ?? ""} enabled={Boolean(home?.canSwitch)} />
      {!home && !message ? <Loading /> : null}
      {home?.home ? <Note text={home.home} /> : null}

      {visitors.map((pass) => (
        <Pressable key={pass.id} onPress={() => router.push(`/(resident)/pass/${pass.id}`)} style={[ui.card, { borderLeftWidth: 3, borderLeftColor: colors.gold }]}>
          <Text style={ui.label}>{pass.atGate ? "At the gate" : "Needs your answer"}</Text>
          <Text style={ui.cardTitle}>{pass.name}</Text>
          <Text style={ui.body}>{pass.purpose || "Visitor waiting for a decision"}</Text>
        </Pressable>
      ))}
      {replies.map((item) => (
        <Pressable key={item.id} onPress={() => router.push(`/(resident)/request/${item.id}`)} style={[ui.card, { borderLeftWidth: 3, borderLeftColor: colors.goldInk }]}>
          <Text style={ui.label}>Needs a reply · {item.status}</Text>
          <Text style={ui.cardTitle}>{item.body}</Text>
        </Pressable>
      ))}

      <SectionLabel title="Important updates" />
      {home && notices.length === 0 ? (
        <Empty title="No announcements" detail="Water, power, lift, and association notices appear here when the office publishes them." />
      ) : null}
      {notices.map((notice) => (
        <Pressable key={notice.id} onPress={() => router.push(`/(resident)/notice/${notice.id}`)} style={[ui.card, { borderLeftWidth: 3, borderLeftColor: notice.important ? colors.goldInk : colors.line }]}>
          <Text style={ui.label}>{notice.important ? "Important" : notice.label} · {notice.date}</Text>
          <Text style={ui.cardTitle}>{notice.title}</Text>
          {notice.body ? <HtmlBody html={notice.body} lines={2} /> : null}
        </Pressable>
      ))}

      {home ? <SectionLabel title="Quick actions" /> : null}
      {home ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 }}>
          {actions.map((action) => (
            <View key={action.label} style={{ width: "50%", padding: 6 }}>
              <Tile icon={action.icon} label={action.label} onPress={() => router.push(action.href as never)} />
            </View>
          ))}
        </View>
      ) : null}

      {home ? <SectionLabel title="My activity" /> : null}
      {openComplaints.map((item) => (
        <Pressable key={item.id} onPress={() => router.push(`/(resident)/request/${item.id}`)} style={ui.card}>
          <Text style={ui.label}>{item.category} · {item.status}</Text>
          <Text style={ui.cardTitle}>{item.body}</Text>
          <Text style={ui.meta}>{item.date}</Text>
        </Pressable>
      ))}
      {events.map((event) => (
        <Pressable key={event.id} onPress={() => router.push(`/(resident)/post/${event.id}`)} style={ui.card}>
          <Text style={ui.label}>You're going{event.startsLabel ? ` · ${event.startsLabel}` : ""}</Text>
          <HtmlBody html={event.body} lines={2} style={ui.cardTitle} />
        </Pressable>
      ))}
      {home && activityQuiet ? (
        <Empty title="Nothing in progress" detail="Open complaints and events you have registered for will show up here." />
      ) : null}

      {message ? (
        <View style={{ gap: 8 }}>
          <Note text={message} />
          <Pressable accessibilityRole="button" onPress={() => { load().catch(() => undefined); }} style={ui.button}>
            <Text style={ui.buttonText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}
    </Screen>
  );
}
