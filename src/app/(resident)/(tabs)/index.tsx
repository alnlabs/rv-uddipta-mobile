import { useCallback, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Empty, SectionLabel } from "@/components/Blocks";
import { HtmlBody } from "@/components/HtmlText";
import { Icon } from "@/components/Icon";
import { Note, Screen, Tile } from "@/components/Screen";
import { loadAccount, loadAttention, loadNotices } from "@/lib/community";
import { planDayLabel } from "@/lib/day";
import { loadFeatures } from "@/lib/features";
import { loadMyUpcomingEvents, type FeedPost } from "@/lib/feed";
import {
  availableQuickActions,
  dismissHomeNotices,
  loadHomeDisplay,
  type HomeDisplay,
} from "@/lib/homePrefs";
import { setAppBadge } from "@/lib/notify";
import { type Account } from "@/lib/place";
import { useSession } from "@/lib/session";
import { colors, fonts, ui } from "@/theme";

type Attention = Awaited<ReturnType<typeof loadAttention>>;
type Notice = Awaited<ReturnType<typeof loadNotices>>[number];

const FAB_CLEARANCE = 88;

export default function HomeScreen() {
  const { session } = useSession();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [home, setHome] = useState<Account | null>(null);
  const [attention, setAttention] = useState<Attention | null>(null);
  const [pile, setPile] = useState<Notice[]>([]);
  const [noticeCount, setNoticeCount] = useState(0);
  const [events, setEvents] = useState<FeedPost[]>([]);
  const [features, setFeatures] = useState<string[] | null>(null);
  const [layout, setLayout] = useState<HomeDisplay | null>(null);
  const [message, setMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      const [account, today, registered, enabled, allNotices, homeDisplay] = await Promise.all([
        loadAccount(),
        loadAttention(),
        loadMyUpcomingEvents().catch(() => [] as FeedPost[]),
        loadFeatures().catch(() => null),
        loadNotices().catch(() => [] as Notice[]),
        loadHomeDisplay(),
      ]);
      setHome(account);
      setAttention(today);
      setEvents(registered);
      setFeatures(enabled);
      setLayout(homeDisplay);
      setNoticeCount(allNotices.length);
      const dismissedSet = new Set(homeDisplay.dismissedIds);
      setPile(
        homeDisplay.showImportant
          ? allNotices.filter((notice) => notice.important && !dismissedSet.has(notice.id))
          : [],
      );
      setAppBadge(today.unread.length).catch(() => undefined);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load your home.");
    }
  }, [session]);

  useFocusEffect(useCallback(() => {
    setActionsOpen(false);
    load();
  }, [load]));

  useFocusEffect(useCallback(() => {
    loadAccount().then((account) => {
      if (account.superAdmin) router.replace("/(super)");
    }).catch(() => undefined);
  }, [router]));

  const visitors = attention?.waitingVisitors ?? [];
  const plannedVisitors = attention?.plannedVisitors ?? [];
  const plannedBookings = attention?.plannedBookings ?? [];
  const replies = attention?.waitingRequests ?? [];
  const openComplaints = attention?.openRequests ?? [];
  const canComplain = Boolean(home && home.role !== "visitor" && (home.hasFlat || home.flatNumber));
  const canInvite = canComplain;
  const comingUp = plannedVisitors.length > 0 || plannedBookings.length > 0 || events.length > 0;
  const activityQuiet =
    openComplaints.length === 0
    && !comingUp
    && visitors.length === 0
    && replies.length === 0;

  async function closePile() {
    const ids = pile.map((notice) => notice.id);
    setPile([]);
    await dismissHomeNotices(ids).catch(() => undefined);
  }

  const showActivity = layout?.showActivity !== false;
  const showPinned = layout?.showImportant !== false;

  const actions = availableQuickActions({
    features,
    canComplain: canInvite,
    selected: layout?.quickActions ?? null,
  });

  function openAction(href: string) {
    setActionsOpen(false);
    router.push(href as never);
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen
        underHeader
        padBottom={actions.length ? FAB_CLEARANCE : 0}
        refreshing={refreshing}
        busy={!home && !message}
        onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
      >
        <Text style={ui.heading}>{home?.greeting || "Home"}</Text>
        {home?.home ? <Note text={home.home} /> : null}
        {home?.needsClaim ? (
          <Pressable onPress={() => router.push("/(public)/join")} style={ui.button}>
            <Text style={ui.buttonText}>Request access</Text>
          </Pressable>
        ) : null}
        {visitors.map((pass) => (
          <Pressable key={pass.id} onPress={() => router.push(`/(resident)/pass/${pass.id}`)} style={[ui.card, { borderLeftWidth: 3, borderLeftColor: colors.gold }]}>
            <Text style={ui.label}>{pass.atGate ? "At the gate" : "Approve visitor"}</Text>
            <Text style={ui.cardTitle}>{pass.name}</Text>
            <Text style={ui.body}>
              {pass.atGate
                ? "Security says they are here. Let them in or send them away."
                : pass.purpose || "Someone asked to visit your home."}
            </Text>
          </Pressable>
        ))}
        {replies.map((item) => (
          <Pressable key={item.id} onPress={() => router.push(`/(resident)/request/${item.id}`)} style={[ui.card, { borderLeftWidth: 3, borderLeftColor: colors.goldInk }]}>
            <Text style={ui.label}>Needs a reply · {item.status}</Text>
            <HtmlBody html={item.body} lines={2} style={ui.cardTitle} />
          </Pressable>
        ))}

        {attention?.incomplete ? <Note text="Some updates could not be loaded. Pull to refresh." /> : null}
        {home && !features ? <Note text="Could not check which features are open." /> : null}

        {pile.length > 0 ? (
          <View style={[ui.card, { gap: 12, borderLeftWidth: 3, borderLeftColor: colors.goldInk }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Text style={[ui.cardTitle, { flex: 1 }]}>Important updates</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close important updates"
                onPress={() => { closePile().catch(() => undefined); }}
                hitSlop={8}
                style={{ minHeight: 36, paddingHorizontal: 10, justifyContent: "center" }}
              >
                <Text style={ui.quietText}>Close</Text>
              </Pressable>
            </View>
            {pile.map((notice, index) => (
              <Pressable
                key={notice.id}
                onPress={() => router.push(`/(resident)/notice/${notice.id}`)}
                style={index > 0 ? { paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line, gap: 4 } : { gap: 4 }}
              >
                <Text style={ui.label}>{notice.important ? "Important" : notice.label} · {notice.date}</Text>
                <Text style={ui.cardTitle}>{notice.title}</Text>
                {notice.body ? <HtmlBody html={notice.body} lines={2} /> : null}
              </Pressable>
            ))}
            <Text style={ui.meta}>Still available in Feed and Notices.</Text>
          </View>
        ) : null}
        {showPinned && home && !attention?.incomplete && noticeCount === 0 && pile.length === 0 ? (
          <Empty title="No announcements" detail="Water, power, lift, and association notices appear here when the office publishes them." />
        ) : null}

        {showActivity && comingUp ? <SectionLabel title="Coming up" /> : null}
        {showActivity ? plannedVisitors.map((pass) => (
          <Pressable key={`pass-${pass.id}`} onPress={() => router.push(`/(resident)/pass/${pass.id}`)} style={ui.card}>
            <Text style={ui.label}>
              {pass.raw === "inside" ? "Visitor inside" : "Gate pass"} · {planDayLabel(pass.date)}
            </Text>
            <Text style={ui.cardTitle}>{pass.name}</Text>
            <Text style={ui.meta}>{pass.purpose || pass.status}</Text>
          </Pressable>
        )) : null}
        {showActivity ? plannedBookings.map((booking) => (
          <Pressable key={`book-${booking.id}`} onPress={() => router.push("/(resident)/amenities")} style={ui.card}>
            <Text style={ui.label}>
              Amenity · {planDayLabel(booking.when)}{booking.slot ? ` · ${booking.slot}` : ""}
            </Text>
            <Text style={ui.cardTitle}>{booking.space}</Text>
            <Text style={ui.meta}>{booking.status}</Text>
          </Pressable>
        )) : null}
        {showActivity ? events.map((event) => (
          <Pressable key={event.id} onPress={() => router.push(`/(resident)/post/${event.id}`)} style={ui.card}>
            <Text style={ui.label}>
              Event{event.startsOn || event.startsLabel
                ? ` · ${planDayLabel(event.startsOn) || event.startsLabel}`
                : ""}
            </Text>
            <HtmlBody html={event.body} lines={2} style={ui.cardTitle} />
          </Pressable>
        )) : null}

        {showActivity && openComplaints.length ? <SectionLabel title="Open complaints" /> : null}
        {showActivity ? openComplaints.map((item) => (
          <Pressable key={item.id} onPress={() => router.push(`/(resident)/request/${item.id}`)} style={ui.card}>
            <Text style={ui.label}>{item.category} · {item.status}</Text>
            <HtmlBody html={item.body} lines={2} style={ui.cardTitle} />
            <Text style={ui.meta}>{item.date}</Text>
          </Pressable>
        )) : null}
        {showActivity && home && !attention?.incomplete && activityQuiet && !home.needsClaim ? (
          <Empty
            title="Nothing planned"
            detail="Gate passes, amenity bookings, events you are going to, and open complaints show up here."
          />
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

      {actions.length ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quick actions"
          onPress={() => setActionsOpen(true)}
          style={{
            position: "absolute",
            right: 20,
            bottom: Math.max(insets.bottom, 12) + 12,
            width: 56,
            height: 56,
            borderRadius: 18,
            backgroundColor: colors.button,
            alignItems: "center",
            justifyContent: "center",
            elevation: 4,
            shadowColor: "#0f172a",
            shadowOpacity: 0.18,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
          }}
        >
          <Icon name={actionsOpen ? "close" : "plus"} color={colors.onButton} size={22} />
        </Pressable>
      ) : null}

      <Modal
        visible={actionsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setActionsOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(15, 23, 42, 0.45)", justifyContent: "flex-end" }}
          onPress={() => setActionsOpen(false)}
        >
          <Pressable
            onPress={() => undefined}
            style={{
              backgroundColor: colors.page,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Text style={[ui.heading, { flex: 1, fontSize: 20 }]}>Quick actions</Text>
              <Pressable onPress={() => setActionsOpen(false)} hitSlop={8}>
                <Text style={{ color: colors.muted, fontFamily: fonts.display, fontWeight: "600" }}>Close</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 }}>
              {actions.map((action) => (
                <View key={action.label} style={{ width: "50%", padding: 6 }}>
                  <Tile icon={action.icon} label={action.label} onPress={() => openAction(action.href)} />
                </View>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
