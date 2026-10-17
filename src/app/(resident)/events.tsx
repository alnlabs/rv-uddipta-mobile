import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { Banner, Empty, PageTitle, SectionLabel, TextButton } from "@/components/Blocks";
import { PostCard } from "@/components/PostCard";
import { Loading, Screen } from "@/components/Screen";
import { loadBoard, type FeedPost } from "@/lib/feed";

export default function EventsScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [canPost, setCanPost] = useState(false);
  const [available, setAvailable] = useState(true);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      const board = await loadBoard();
      setPosts(board.posts.filter((post) => post.kind === "event" || post.kind === "celebration"));
      setCanPost(board.access.events === "manage");
      setAvailable(board.access.events !== "none");
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load events.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const upcoming = posts.filter((post) => post.upcoming);
  const past = posts.filter((post) => !post.upcoming);

  return (
    <Screen
      title="Events"
      onRefresh={load}
      action={canPost ? <TextButton label="New" onPress={() => router.push("/(resident)/post/new?kind=event")} /> : undefined}
    >
      <PageTitle kicker="Community" detail="The date sits beside the plan. An RSVP means you are going." />
      {message ? <Banner text={message} /> : null}
      {!ready ? <Loading /> : null}
      {ready && !available ? <Empty title="Events unavailable" detail="Events are not available on your account." /> : null}
      {ready && available ? <SectionLabel title="Upcoming" /> : null}
      {ready && available && upcoming.length === 0 ? <Empty title="No upcoming events" detail="A new date will appear here." /> : null}
      {upcoming.map((post) => (
        <PostCard key={post.id} post={post} onPress={() => router.push(`/(resident)/post/${post.id}`)} />
      ))}
      {past.length ? <SectionLabel title="Past" /> : null}
      {past.map((post) => (
        <PostCard key={post.id} post={post} onPress={() => router.push(`/(resident)/post/${post.id}`)} />
      ))}
    </Screen>
  );
}
