import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { RoleSwitch } from "@/components/RoleSwitch";
import { Loading, Masthead, Note, Screen, Tile } from "@/components/Screen";
import { loadAccount, loadAttention } from "@/lib/community";
import { type Account } from "@/lib/place";
import { useSession } from "@/lib/session";
import { colors, ui } from "@/theme";

export default function HomeScreen() {
  const { session } = useSession();
  const router = useRouter();
  const [home, setHome] = useState<Account | null>(null);
  const [attention, setAttention] = useState<Awaited<ReturnType<typeof loadAttention>> | null>(null);
  const [message, setMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      const [account, today] = await Promise.all([loadAccount(), loadAttention()]);
      setHome(account);
      setAttention(today);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load your home.");
    }
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const visitors = attention?.waitingVisitors ?? [];
  const requests = attention?.waitingRequests ?? [];
  const notices = attention?.notices ?? [];
  const unread = attention?.unread.length ?? 0;
  const canAsk = Boolean(home && home.role !== "visitor" && home.flatNumber);

  const quiet = visitors.length === 0 && requests.length === 0 && notices.length === 0 && unread === 0;
  const place = [home?.roleLabel, home?.flatNumber].filter(Boolean).join(" · ");

  return (
    <Screen hero refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}>
      <Masthead title={home?.greeting || "RV Uddiipta"} detail={place || undefined}>
        <RoleSwitch roles={home?.roles ?? []} active={home?.role ?? ""} enabled={Boolean(home?.canSwitch)} />
      </Masthead>
      {!home && !message ? <Loading /> : null}
      {home?.home ? <Note text={home.home} /> : null}
      <View style={{ flexDirection: "row", gap: 10 }}>
        {canAsk ? <Tile icon="people" label="Invite" onPress={() => router.push("/(resident)/invite")} /> : null}
        {canAsk ? <Tile icon="form" label="Request" onPress={() => router.push("/(resident)/request/new")} /> : null}
        <Tile icon="bell" label="Notices" onPress={() => router.push("/(resident)/notices")} />
      </View>
      {unread > 0 ? (
        <Pressable onPress={() => router.push("/(resident)/notifications")} style={[ui.card, { flexDirection: "row", alignItems: "center", gap: 12 }]}>
          <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
            <Icon name="bell" color={colors.gold} size={20} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={ui.cardTitle}>{unread} unread</Text>
            <Text style={ui.body}>Open notifications</Text>
          </View>
        </Pressable>
      ) : null}
      {visitors.map((pass) => (
        <Pressable key={pass.id} onPress={() => router.push(`/(resident)/pass/${pass.id}`)} style={[ui.card, { borderLeftWidth: 3, borderLeftColor: colors.gold }]}>
          <Text style={ui.label}>{pass.atGate ? "At the gate" : "Needs your answer"}</Text>
          <Text style={ui.cardTitle}>{pass.name}</Text>
          <Text style={ui.body}>{pass.purpose || "Needs your answer"}</Text>
        </Pressable>
      ))}
      {requests.map((item) => (
        <Pressable key={item.id} onPress={() => router.push(`/(resident)/request/${item.id}`)} style={[ui.card, { borderLeftWidth: 3, borderLeftColor: colors.goldInk }]}>
          <Text style={ui.label}>Needs a reply</Text>
          <Text style={ui.cardTitle}>{item.body}</Text>
        </Pressable>
      ))}
      {notices.map((notice) => (
        <Pressable key={notice.id} onPress={() => router.push(`/(resident)/notice/${notice.id}`)} style={[ui.card, { borderLeftWidth: 3, borderLeftColor: notice.important ? colors.goldInk : colors.line }]}>
          <Text style={ui.label}>{notice.important ? "Important notice" : "Notice"} · {notice.date}</Text>
          <Text style={ui.cardTitle}>{notice.title}</Text>
        </Pressable>
      ))}
      {home && quiet ? <Text style={ui.body}>Nothing is waiting on you.</Text> : null}
      {message ? <Note text={message} /> : null}
    </Screen>
  );
}
