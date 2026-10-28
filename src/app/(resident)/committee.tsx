import { useCallback, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Back, Loading, Note, Screen } from "@/components/Screen";
import { decideCommittee, loadCommittee } from "@/lib/office";
import { colors, ui } from "@/theme";

export default function CommitteeScreen() {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadCommittee>> | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [decision, setDecision] = useState("");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await loadCommittee());
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load committee items.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function save(item: NonNullable<typeof data>["items"][number]) {
    if (saving) return;
    setSaving(true);
    setMessage("");
    try {
      await decideCommittee({
        itemId: item.id,
        title: item.title,
        body: item.body,
        kind: item.kind,
        decision,
      });
      setOpenId(null);
      setDecision("");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save that decision.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen onRefresh={load}>
      <Back />
      <Text style={ui.eyebrow}>Committee</Text>
      <Text style={ui.title}>Decisions</Text>
      <Text style={ui.body}>Open items for the committee. Record a short decision when ready.</Text>
      {!ready ? <Loading /> : null}
      {ready && (data?.items.length ?? 0) === 0 ? <Text style={ui.body}>No committee items yet.</Text> : null}
      {(data?.items ?? []).map((item) => (
        <View key={item.id} style={ui.card}>
          <Text style={ui.label}>{item.kind} · {item.status}</Text>
          <Text style={ui.cardTitle}>{item.title}</Text>
          {item.body ? <Text style={ui.body}>{item.body}</Text> : null}
          {item.decision ? <Text style={ui.body}>Decision · {item.decision}</Text> : null}
          {data?.canManage && item.status === "open" ? (
            openId === item.id ? (
              <>
                <TextInput
                  value={decision}
                  onChangeText={setDecision}
                  placeholder="Write the decision"
                  placeholderTextColor={colors.placeholder}
                  style={ui.field}
                  multiline
                />
                <Pressable disabled={saving} onPress={() => save(item)} style={ui.button}>
                  <Text style={ui.buttonText}>{saving ? "Saving…" : "Record decision"}</Text>
                </Pressable>
              </>
            ) : (
              <Pressable onPress={() => { setOpenId(item.id); setDecision(""); }} style={ui.quiet}>
                <Text style={ui.quietText}>Decide</Text>
              </Pressable>
            )
          ) : null}
        </View>
      ))}
      {message ? <Note text={message} /> : null}
    </Screen>
  );
}
