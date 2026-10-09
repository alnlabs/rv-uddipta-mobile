import { useCallback, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Back, Loading, Note, Screen } from "@/components/Screen";
import { loadRequests, replyRequest } from "@/lib/community";
import { colors, ui } from "@/theme";

export default function RequestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<Awaited<ReturnType<typeof loadRequests>>["requests"][number] | null>(null);
  const [reply, setReply] = useState("");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await loadRequests();
      setItem(data.requests.find((row) => row.id === Number(id)) ?? null);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load the request.");
    } finally {
      setReady(true);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function send() {
    if (!item) return;
    setMessage("");
    try {
      const sent = await replyRequest(item.id, reply);
      setReply("");
      await load();
      setMessage(sent);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send that.");
    }
  }

  return (
    <Screen onRefresh={load}>
      <Back />
      {!ready ? <Loading /> : null}
      {item ? (
        <>
          <Text style={ui.label}>{item.status} · {item.date}</Text>
          <Text style={ui.title}>{item.kind}</Text>
          <Text style={ui.body}>{item.body}</Text>
          {item.messages.map((line) => (
            <View key={line.id} style={ui.card}>
              <Text style={ui.label}>{line.who}</Text>
              <Text style={ui.body}>{line.body}</Text>
            </View>
          ))}
          {item.canReply ? (
            <>
              <TextInput value={reply} onChangeText={setReply} placeholder="Write a reply" placeholderTextColor={colors.placeholder} style={ui.field} />
              <Pressable onPress={send} style={ui.button}>
                <Text style={ui.buttonText}>Send reply</Text>
              </Pressable>
            </>
          ) : null}
        </>
      ) : null}
      {ready && !item && !message ? <Text style={ui.body}>This request is not available.</Text> : null}
      {message ? <Note text={message} tone={message === "Sent." ? "ok" : "error"} /> : null}
    </Screen>
  );
}
