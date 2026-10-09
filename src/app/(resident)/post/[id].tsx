import { useCallback, useState } from "react";
import { Alert, Image, Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Avatar, Banner, PageTitle, Panel, SectionLabel } from "@/components/Blocks";
import { Loading, Screen } from "@/components/Screen";
import {
  closePoll,
  loadThread,
  reactToPost,
  removePost,
  removeReply,
  replyToPost,
  reportPost,
  rsvpEvent,
  votePoll,
  type FeedPost,
  type Reply,
} from "@/lib/feed";
import { colors, fonts, ui } from "@/theme";

export default function PostScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);
  const [post, setPost] = useState<FeedPost | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [canReply, setCanReply] = useState(false);
  const [canVote, setCanVote] = useState(false);
  const [canRsvp, setCanRsvp] = useState(false);
  const [reply, setReply] = useState("");
  const [reason, setReason] = useState("");
  const [reporting, setReporting] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"error" | "ok">("error");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (keepNote = false) => {
    try {
      const thread = await loadThread(id);
      setPost(thread.post);
      setReplies(thread.replies);
      setCanReply(thread.access.feed === "manage");
      setCanVote(thread.access.polls === "manage");
      setCanRsvp(thread.access.events === "manage");
      if (!keepNote) setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load that post.");
      setTone("error");
    } finally {
      setReady(true);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function run(action: () => Promise<string | void>) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const note = await action();
      if (note) {
        setMessage(note);
        setTone("ok");
      }
      await load(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save that.");
      setTone("error");
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete() {
    Alert.alert("Delete this post?", "It will leave the community.", [
      { text: "Keep", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          run(async () => {
            await removePost(id);
            router.back();
          }).catch(() => undefined);
        },
      },
    ]);
  }

  return (
    <Screen onRefresh={load}>
      <PageTitle
        kicker={post?.label || "Community"}
        title={post?.author || "Post"}
        detail={post ? [post.flat, post.date].filter(Boolean).join(" · ") : undefined}
      />
      {!ready ? <Loading /> : null}
      {message ? <Banner text={message} tone={tone} /> : null}
      {post ? (
        <>
          <Panel>
            {post.startsLabel ? <Text style={ui.meta}>Date · {post.startsLabel}</Text> : null}
            {post.sold ? <Text style={{ color: colors.goldInk, fontFamily: fonts.display, fontWeight: "600" }}>Marked sold</Text> : null}
            <Text style={{ color: colors.ink, fontFamily: fonts.body, fontSize: 17, lineHeight: 25 }}>{post.body}</Text>
            {post.image ? (
              <Image source={{ uri: post.image }} style={{ width: "100%", height: 220, borderRadius: 16, backgroundColor: colors.line }} />
            ) : null}
          </Panel>

          {post.kind === "event" ? (
            <Panel>
              <Text style={ui.cardTitle}>{post.goingCount} going</Text>
              <Text style={ui.meta}>An RSVP tells neighbours you plan to be there.</Text>
              {canRsvp ? (
                <Pressable onPress={() => run(async () => rsvpEvent(id))} style={ui.button}>
                  <Text style={ui.buttonText}>{post.going ? "Cancel RSVP" : "I am going"}</Text>
                </Pressable>
              ) : null}
            </Panel>
          ) : null}

          {post.kind === "poll" ? (
            <Panel>
              <Text style={ui.meta}>
                {post.closed ? "Voting is closed. " : ""}
                {post.multiple ? "You can select more than one choice." : "Your latest choice replaces the earlier one."}
              </Text>
              {post.options.map((option) => (
                <Pressable
                  key={option.id}
                  disabled={busy || post.closed || !canVote}
                  onPress={() => run(async () => {
                    await votePoll(id, option.id);
                    return "Vote saved.";
                  })}
                  style={{
                    minHeight: 52,
                    borderRadius: 16,
                    overflow: "hidden",
                    justifyContent: "center",
                    backgroundColor: "rgba(15, 23, 42, 0.04)",
                  }}
                >
                  <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${option.share}%`, backgroundColor: option.mine ? colors.brandSoft : "rgba(15, 23, 42, 0.08)" }} />
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, gap: 12 }}>
                    <Text style={{ flex: 1, color: colors.ink, fontFamily: fonts.display, fontSize: 16, fontWeight: "600" }}>{option.label}</Text>
                    <Text style={ui.meta}>{option.mine ? (post.multiple ? "Selected · " : "Your vote · ") : ""}{option.share}%</Text>
                  </View>
                </Pressable>
              ))}
              {post.canClose ? (
                <Pressable onPress={() => run(async () => { await closePoll(id); return "Voting is closed."; })} style={ui.quiet}>
                  <Text style={ui.quietText}>Close poll</Text>
                </Pressable>
              ) : null}
            </Panel>
          ) : null}

          <View style={{ flexDirection: "row", gap: 10 }}>
            {(["helpful", "thanks"] as const).map((kind) => {
              const active = post.reaction === kind;
              const count = kind === "helpful" ? post.helpful : post.thanks;
              const label = kind === "helpful" ? "Helpful" : "Thanks";
              return (
                <Pressable
                  key={kind}
                  disabled={!canReply}
                  onPress={() => run(async () => {
                    await reactToPost(id, kind);
                    return active ? "Reaction removed." : kind === "helpful" ? "Marked helpful." : "Thanks sent.";
                  })}
                  style={[ui.surface, { flex: 1, paddingVertical: 14, alignItems: "center", backgroundColor: active ? colors.button : colors.white }]}
                >
                  <Text style={{ color: active ? colors.onButton : colors.ink, fontFamily: fonts.display, fontWeight: "600" }}>{label}</Text>
                  <Text style={{ color: active ? colors.onButton : colors.muted, fontFamily: fonts.body, marginTop: 2 }}>{count}</Text>
                </Pressable>
              );
            })}
          </View>

          <SectionLabel title={`Comments · ${replies.length}`} />
          <Panel>
            {replies.length === 0 ? <Text style={ui.meta}>No comments yet.</Text> : null}
            {replies.map((item, index) => (
              <View key={item.id} style={{ flexDirection: "row", gap: 10, paddingTop: index === 0 ? 0 : 12, borderTopWidth: index === 0 ? 0 : 1, borderTopColor: colors.line }}>
                <Avatar name={item.author} size={34} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={ui.meta}>{item.who} · {item.date}</Text>
                  <Text style={{ color: colors.ink, fontFamily: fonts.body, fontSize: 15, lineHeight: 21 }}>{item.body}</Text>
                  {item.canDelete ? (
                    <Pressable onPress={() => run(async () => { await removeReply(item.id); return "Reply removed."; })}>
                      <Text style={[ui.quietText, { textAlign: "left" }]}>Delete</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}
            {canReply ? (
              <View style={{ gap: 10, marginTop: 4 }}>
                <TextInput
                  value={reply}
                  onChangeText={setReply}
                  placeholder="Write a comment"
                  placeholderTextColor={colors.placeholder}
                  style={[ui.field, { minHeight: 88, textAlignVertical: "top", backgroundColor: colors.page }]}
                  multiline
                />
                <Pressable
                  onPress={() => run(async () => {
                    await replyToPost(id, reply);
                    setReply("");
                    return "Reply sent.";
                  })}
                  style={ui.button}
                >
                  <Text style={ui.buttonText}>{busy ? "Sending…" : "Reply"}</Text>
                </Pressable>
              </View>
            ) : null}
          </Panel>

          <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4 }}>
            {post.mine ? (
              <Pressable onPress={() => router.push(`/(resident)/post/new?id=${post.id}`)}>
                <Text style={ui.quietText}>Edit</Text>
              </Pressable>
            ) : <View />}
            {post.canDelete ? (
              <Pressable onPress={confirmDelete}>
                <Text style={[ui.quietText, { color: colors.danger }]}>Delete</Text>
              </Pressable>
            ) : null}
            {!post.mine && !post.reported ? (
              <Pressable onPress={() => setReporting(true)}>
                <Text style={ui.quietText}>Report</Text>
              </Pressable>
            ) : null}
            {post.reported ? <Text style={ui.meta}>Reported</Text> : null}
          </View>
          {reporting && !post.mine && !post.reported ? (
            <Panel>
              <Text style={ui.cardTitle}>Report this post</Text>
              <TextInput
                value={reason}
                onChangeText={setReason}
                placeholder="What is wrong with this post?"
                placeholderTextColor={colors.placeholder}
                style={[ui.field, { minHeight: 88, textAlignVertical: "top", backgroundColor: colors.page }]}
                multiline
              />
              <Pressable
                onPress={() => run(async () => {
                  await reportPost(id, reason);
                  setReporting(false);
                  setReason("");
                  return "Your report is saved.";
                })}
                style={ui.button}
              >
                <Text style={ui.buttonText}>Send report</Text>
              </Pressable>
            </Panel>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
