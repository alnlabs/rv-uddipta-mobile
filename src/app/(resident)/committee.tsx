import { useCallback, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { HtmlBody } from "@/components/HtmlText";
import { Note, Screen } from "@/components/Screen";
import { createCommitteeItem, decideCommittee, loadCommittee } from "@/lib/office";
import { colors, ui } from "@/theme";

const KINDS = [
  { value: "policy", label: "Policy" },
  { value: "budget", label: "Budget" },
  { value: "vote", label: "Vote" },
] as const;

export default function CommitteeScreen() {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadCommittee>> | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [decision, setDecision] = useState("");
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<(typeof KINDS)[number]["value"]>("policy");
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

  async function create() {
    if (saving) return;
    setSaving(true);
    setMessage("");
    try {
      await createCommitteeItem({ title, body, kind });
      setTitle("");
      setBody("");
      setKind("policy");
      setCreating(false);
      setMessage("Item added.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create that item.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen title="Committee" onRefresh={load} busy={!ready && !message}>
      <Text style={ui.body}>Add agenda items and record short decisions.</Text>
      {data?.canManage ? (
        creating ? (
          <View style={ui.card}>
            <Text style={ui.label}>New item</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder="Title" placeholderTextColor={colors.placeholder} style={ui.field} />
            <TextInput value={body} onChangeText={setBody} placeholder="Details (optional)" placeholderTextColor={colors.placeholder} style={ui.field} multiline />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {KINDS.map((item) => {
                const on = kind === item.value;
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => setKind(item.value)}
                    style={[ui.button, { paddingVertical: 10, backgroundColor: on ? colors.button : colors.white, borderWidth: 1, borderColor: colors.button }]}
                  >
                    <Text style={[ui.buttonText, { fontSize: 13, color: on ? colors.onButton : colors.button }]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable disabled={saving || !title.trim()} onPress={create} style={ui.button}>
              <Text style={ui.buttonText}>{saving ? "Saving…" : "Add item"}</Text>
            </Pressable>
            <Pressable onPress={() => setCreating(false)} style={ui.quiet}>
              <Text style={ui.quietText}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setCreating(true)} style={ui.button}>
            <Text style={ui.buttonText}>New item</Text>
          </Pressable>
        )
      ) : null}
      {ready && (data?.items.length ?? 0) === 0 ? <Text style={ui.body}>No committee items yet.</Text> : null}
      {(data?.items ?? []).map((item) => (
        <View key={item.id} style={ui.card}>
          <Text style={ui.label}>{item.kind} · {item.status}</Text>
          <Text style={ui.cardTitle}>{item.title}</Text>
          {item.body ? <HtmlBody html={item.body} /> : null}
          {item.decision ? <HtmlBody html={`Decision · ${item.decision}`} /> : null}
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
      {message ? <Note text={message} tone={message === "Item added." ? "ok" : "error"} /> : null}
    </Screen>
  );
}
