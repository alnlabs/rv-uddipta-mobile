import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { Banner, Chips, Empty, PageTitle, TextButton } from "@/components/Blocks";
import { PostCard } from "@/components/PostCard";
import { Loading, Screen } from "@/components/Screen";
import { loadBoard, type FeedPost } from "@/lib/feed";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "talk", label: "Talk" },
  { value: "neighbours", label: "Neighbours" },
  { value: "plans", label: "Plans" },
] as const;

export default function FeedScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [canPost, setCanPost] = useState(false);
  const [available, setAvailable] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("all");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      const board = await loadBoard();
      setPosts(board.posts);
      setCanPost(board.access.feed === "manage");
      setAvailable(board.access.feed !== "none");
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load the feed.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const visible = posts.filter((post) => filter === "all" || post.group === filter);

  return (
    <Screen
      title="Feed"
      onRefresh={load}
      action={canPost ? <TextButton label="New" onPress={() => router.push("/(resident)/post/new?kind=update")} /> : undefined}
    >
      <PageTitle kicker="Residents" detail="Neighbour posts. Office notices stay on their own screen." />
      <Chips options={FILTERS} value={filter} onChange={(value) => setFilter(value as (typeof FILTERS)[number]["value"])} />
      {message ? <Banner text={message} /> : null}
      {!ready ? <Loading /> : null}
      {ready && !available ? <Empty title="Feed unavailable" detail="The feed is not available on your account." /> : null}
      {ready && available && visible.length === 0 ? <Empty title="Nothing here yet" detail="Posts in this view will show up as cards." /> : null}
      {visible.map((post) => (
        <PostCard key={post.id} post={post} onPress={() => router.push(`/(resident)/post/${post.id}`)} />
      ))}
    </Screen>
  );
}
