import { useCallback, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Banner, Chips, Empty, TextButton } from "@/components/Blocks";
import { HtmlBody } from "@/components/HtmlText";
import { PostCard } from "@/components/PostCard";
import { Screen } from "@/components/Screen";
import { loadNotices } from "@/lib/community";
import { loadFeatures, featureOn } from "@/lib/features";
import { loadBoard, type FeedPost } from "@/lib/feed";
import { colors, ui } from "@/theme";

type Notice = Awaited<ReturnType<typeof loadNotices>>[number];
type Filter = "all" | "notices" | "events" | "polls" | "talk" | "neighbours" | "plans" | "emergency";

const ALL_FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "notices", label: "Notices" },
  { value: "events", label: "Events" },
  { value: "polls", label: "Polls" },
  { value: "talk", label: "Talk" },
  { value: "neighbours", label: "Neighbours" },
  { value: "plans", label: "Plans" },
  { value: "emergency", label: "Emergency" },
];

function matchesFilter(post: FeedPost, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "notices") return false;
  if (filter === "events") return post.kind === "event";
  if (filter === "polls") return post.kind === "poll";
  return post.group === filter;
}

export default function FeedTabScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [canPost, setCanPost] = useState(false);
  const [available, setAvailable] = useState(true);
  const [features, setFeatures] = useState<string[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      const [board, boardNotices, enabled] = await Promise.all([
        loadBoard(),
        loadNotices().catch(() => [] as Notice[]),
        loadFeatures().catch(() => null),
      ]);
      setPosts(board.posts);
      setNotices(boardNotices);
      setCanPost(board.access.feed === "manage" || board.access.events === "manage" || board.access.polls === "manage");
      setAvailable(board.access.feed !== "none" || board.access.events !== "none" || board.access.polls !== "none");
      setFeatures(enabled);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load the feed.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filters = useMemo(() => {
    const on = (key: string) => features == null || featureOn(features, key);
    return ALL_FILTERS.filter((item) => {
      if (item.value === "notices") return on("announcements");
      if (item.value === "events") return on("events");
      if (item.value === "polls") return on("polls");
      if (item.value === "talk" || item.value === "neighbours" || item.value === "plans" || item.value === "emergency") {
        return on("feed");
      }
      return true;
    });
  }, [features]);

  const activeFilter = filters.some((item) => item.value === filter) ? filter : "all";
  const visiblePosts = posts.filter((post) => matchesFilter(post, activeFilter));
  const visibleNotices = activeFilter === "all" || activeFilter === "notices" ? notices : [];
  const empty = visiblePosts.length === 0 && visibleNotices.length === 0;

  return (
    <Screen
      busy={!ready && !message}
      title="Feed"
      showBack={false}
      onRefresh={load}
      action={canPost ? (
        <TextButton label="Write a post" onPress={() => router.push("/(resident)/post/new?kind=update")} />
      ) : undefined}
    >
      <Text style={ui.body}>Notices, neighbour posts, events, and polls in one place.</Text>
      <Chips options={filters} value={activeFilter} onChange={(value) => setFilter(value as Filter)} />
      {message ? <Banner text={message} /> : null}
      {ready && !available && visibleNotices.length === 0 ? <Empty title="Feed unavailable" detail="The feed is not available on your account." /> : null}
      {ready && available && empty ? <Empty title="Nothing here yet" detail="Posts and notices in this view will show up as cards." /> : null}
      {visibleNotices.map((notice) => (
        <Pressable
          key={`notice-${notice.id}`}
          onPress={() => router.push(`/(resident)/notice/${notice.id}`)}
          style={[ui.card, { borderLeftWidth: 3, borderLeftColor: notice.important ? colors.goldInk : colors.line }]}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
            <Text style={ui.label}>{notice.important ? "Important" : notice.label}</Text>
            <Text style={ui.meta}>{notice.date}</Text>
          </View>
          <Text style={ui.cardTitle}>{notice.title}</Text>
          {notice.body ? <HtmlBody html={notice.body} lines={2} /> : null}
        </Pressable>
      ))}
      {visiblePosts.map((post) => (
        <PostCard key={post.id} post={post} onPress={() => router.push(`/(resident)/post/${post.id}`)} />
      ))}
    </Screen>
  );
}
