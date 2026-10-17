import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Banner, Empty, PageTitle } from "@/components/Blocks";
import { HtmlBody } from "@/components/HtmlText";
import { Loading, Screen } from "@/components/Screen";
import { loadNotices } from "@/lib/community";
import { colors, fonts, ui } from "@/theme";

export default function NoticesScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Awaited<ReturnType<typeof loadNotices>>>([]);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await loadNotices());
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load notices.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen title="Announcements" onRefresh={load}>
      <PageTitle kicker="Office" detail="Official notes for the community. Resident posts stay in the feed." />
      {message ? <Banner text={message} /> : null}
      {!ready ? <Loading /> : null}
      {ready && items.length === 0 ? <Empty title="No notices yet" detail="An office notice will appear here." /> : null}
      {items.map((item) => (
        <Pressable key={item.id} onPress={() => router.push(`/(resident)/notice/${item.id}`)} style={[ui.surface, { padding: 16, gap: 8, backgroundColor: "rgba(180, 83, 9, 0.06)" }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
            <Text style={{ color: colors.goldInk, fontFamily: fonts.display, fontSize: 12, fontWeight: "600" }}>
              {item.important ? "Important" : item.label}
            </Text>
            <Text style={ui.meta}>{item.date}{item.read === true ? " · Read" : item.read === false ? " · Unread" : ""}</Text>
          </View>
          <Text style={ui.cardTitle}>{item.title}</Text>
          {item.body ? <HtmlBody html={item.body} lines={3} /> : null}
        </Pressable>
      ))}
    </Screen>
  );
}
