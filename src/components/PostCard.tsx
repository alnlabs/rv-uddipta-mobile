import { Image, Pressable, Text, View } from "react-native";
import { Avatar } from "@/components/Blocks";
import { HtmlBody } from "@/components/HtmlText";
import { type FeedPost } from "@/lib/feed";
import { colors, fonts, ui } from "@/theme";

function dateParts(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return {
    day: String(day),
    month: date.toLocaleDateString("en-IN", { month: "short" }),
  };
}

function Pill({ text, tone = "soft" }: { text: string; tone?: "soft" | "ink" | "amber" }) {
  const background = tone === "ink" ? colors.button : tone === "amber" ? "rgba(180, 83, 9, 0.12)" : colors.brandSoft;
  const color = tone === "ink" ? colors.onButton : tone === "amber" ? colors.goldInk : colors.gold;
  return (
    <View style={{ alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: background }}>
      <Text style={{ color, fontFamily: fonts.display, fontSize: 12, fontWeight: "600" }}>{text}</Text>
    </View>
  );
}

export function PostCard({ post, onPress }: { post: FeedPost; onPress: () => void }) {
  if (post.kind === "event" || post.kind === "celebration") return <EventCard post={post} onPress={onPress} />;
  if (post.kind === "poll") return <PollCard post={post} onPress={onPress} />;
  return <FeedCard post={post} onPress={onPress} />;
}

function FeedCard({ post, onPress }: { post: FeedPost; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={ui.surface}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingTop: 16 }}>
        <Avatar name={post.author} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 16, fontWeight: "600" }}>{post.author}</Text>
          <Text style={ui.meta}>{[post.flat, post.date].filter(Boolean).join(" · ")}</Text>
        </View>
        <Pill text={post.sold ? "Sold" : post.label} tone={post.sold ? "amber" : "soft"} />
      </View>
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <HtmlBody html={post.body} lines={4} />
      </View>
      {post.image ? (
        <Image source={{ uri: post.image }} style={{ height: 180, marginTop: 12, backgroundColor: colors.line }} />
      ) : null}
      <View style={{ flexDirection: "row", gap: 16, marginTop: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.line }}>
        <Text style={ui.meta}>{post.replies} comments</Text>
        <Text style={ui.meta}>{post.helpful} helpful</Text>
        <Text style={ui.meta}>{post.thanks} thanks</Text>
      </View>
    </Pressable>
  );
}

function EventCard({ post, onPress }: { post: FeedPost; onPress: () => void }) {
  const when = dateParts(post.startsOn);
  return (
    <Pressable onPress={onPress} style={[ui.surface, { flexDirection: "row", overflow: "hidden" }]}>
      <View style={{ width: 76, alignItems: "center", justifyContent: "center", backgroundColor: colors.brandSoft, gap: 2 }}>
        <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 24, fontWeight: "600" }}>{when?.day || "—"}</Text>
        <Text style={{ color: colors.gold, fontFamily: fonts.display, fontSize: 12, fontWeight: "600" }}>{when?.month || "Date"}</Text>
      </View>
      <View style={{ flex: 1, padding: 14, gap: 6 }}>
        <Pill text={post.label} />
        <HtmlBody html={post.body} lines={2} />
        <Text style={ui.meta}>{post.who}{post.kind === "event" ? ` · ${post.goingCount} going` : ""}</Text>
      </View>
    </Pressable>
  );
}

function PollCard({ post, onPress }: { post: FeedPost; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[ui.surface, { padding: 16, gap: 12 }]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <Pill text={post.closed ? "Closed" : "Open"} tone={post.closed ? "ink" : "soft"} />
        <Text style={ui.meta}>{post.who}</Text>
      </View>
      <HtmlBody html={post.body} lines={3} style={{ fontFamily: fonts.display, fontSize: 18, fontWeight: "600", lineHeight: 24 }} />
      <View style={{ gap: 8 }}>
        {post.options.slice(0, 3).map((option) => (
          <View key={option.id} style={{ gap: 4 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
              <Text style={{ flex: 1, color: colors.ink, fontFamily: fonts.body, fontSize: 14 }} numberOfLines={1}>{option.label}</Text>
              <Text style={ui.meta}>{option.share}%</Text>
            </View>
            <View style={{ height: 6, borderRadius: 999, backgroundColor: "rgba(15, 23, 42, 0.08)", overflow: "hidden" }}>
              <View style={{ width: `${option.share}%`, height: 6, borderRadius: 999, backgroundColor: option.mine ? colors.gold : colors.button }} />
            </View>
          </View>
        ))}
      </View>
    </Pressable>
  );
}
