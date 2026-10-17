import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { Banner, Empty, PageTitle, SectionLabel, TextButton } from "@/components/Blocks";
import { PostCard } from "@/components/PostCard";
import { Loading, Screen } from "@/components/Screen";
import { loadBoard, type FeedPost } from "@/lib/feed";

export default function PollsScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [canPost, setCanPost] = useState(false);
  const [available, setAvailable] = useState(true);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      const board = await loadBoard();
      setPosts(board.posts.filter((post) => post.kind === "poll"));
      setCanPost(board.access.polls === "manage");
      setAvailable(board.access.polls !== "none");
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load polls.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const open = posts.filter((post) => !post.closed);
  const closed = posts.filter((post) => post.closed);

  return (
    <Screen
      title="Polls"
      onRefresh={load}
      action={canPost ? <TextButton label="New" onPress={() => router.push("/(resident)/post/new?kind=poll")} /> : undefined}
    >
      <PageTitle kicker="Community" detail="A single-choice poll keeps your latest vote. More than one choice can be changed until it closes." />
      {message ? <Banner text={message} /> : null}
      {!ready ? <Loading /> : null}
      {ready && !available ? <Empty title="Polls unavailable" detail="Polls are not available on your account." /> : null}
      {ready && available && posts.length === 0 ? <Empty title="No polls yet" detail="A question for the community will show its choices here." /> : null}
      {open.length ? <SectionLabel title="Open" /> : null}
      {open.map((post) => (
        <PostCard key={post.id} post={post} onPress={() => router.push(`/(resident)/post/${post.id}`)} />
      ))}
      {closed.length ? <SectionLabel title="Closed" /> : null}
      {closed.map((post) => (
        <PostCard key={post.id} post={post} onPress={() => router.push(`/(resident)/post/${post.id}`)} />
      ))}
    </Screen>
  );
}
