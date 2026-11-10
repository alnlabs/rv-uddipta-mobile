import { useCallback, useState } from "react";
import { Alert, Image, Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Banner, Empty, Panel } from "@/components/Blocks";
import { Screen } from "@/components/Screen";
import {
  loadOfficeRequests,
  officeRequestAction,
  type OfficeRequest,
} from "@/lib/office";
import { colors, ui } from "@/theme";

const STATUSES = [
  { value: "new", label: "New" },
  { value: "in_progress", label: "In progress" },
  { value: "waiting", label: "Waiting" },
  { value: "done", label: "Done" },
] as const;

export default function OfficeRequestsScreen() {
  const [kind, setKind] = useState<"request" | "feedback">("request");
  const [rows, setRows] = useState<OfficeRequest[]>([]);
  const [people, setPeople] = useState<{ id: string; name: string }[]>([]);
  const [canOpenJob, setCanOpenJob] = useState(false);
  const [replyDraft, setReplyDraft] = useState<Record<number, string>>({});
  const [assigneeDraft, setAssigneeDraft] = useState<Record<number, string>>({});
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"error" | "ok">("error");
  const [ready, setReady] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await loadOfficeRequests(kind);
      setRows(data.requests);
      setPeople(data.people);
      setCanOpenJob(data.canOpenJob);
      setMessage("");
    } catch (error) {
      setRows([]);
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Could not load requests.");
    } finally {
      setReady(true);
    }
  }, [kind]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function run(noteId: number, work: () => Promise<{ message: string }>) {
    if (busyId) return;
    setBusyId(noteId);
    setMessage("");
    try {
      const result = await work();
      setTone("ok");
      setMessage(result.message);
      if (result.message.toLowerCase().includes("reply")) {
        setReplyDraft((current) => ({ ...current, [noteId]: "" }));
      }
      await load();
    } catch (error) {
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Could not update that.");
    } finally {
      setBusyId(null);
    }
  }

  function setStatus(row: OfficeRequest, status: (typeof STATUSES)[number]["value"]) {
    if (status === "done") {
      Alert.alert("Mark as done?", "The resident will no longer be able to reply on this thread.", [
        { text: "Cancel", style: "cancel" },
        { text: "Mark done", style: "destructive", onPress: () => run(row.id, () => officeRequestAction({ action: "status", noteId: row.id, status })) },
      ]);
      return;
    }
    run(row.id, () => officeRequestAction({ action: "status", noteId: row.id, status }));
  }

  return (
    <Screen title="Office requests" onRefresh={load} busy={!ready && !message}>
      <Text style={ui.body}>Reply, set status, assign staff, or open a job from a request.</Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {(["request", "feedback"] as const).map((value) => (
          <Pressable
            key={value}
            onPress={() => { setReady(false); setKind(value); }}
            style={[
              ui.button,
              { flex: 1 },
              kind !== value ? { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.button } : null,
            ]}
          >
            <Text style={[ui.buttonText, kind !== value ? { color: colors.button } : null]}>
              {value === "request" ? "Requests" : "Feedback"}
            </Text>
          </Pressable>
        ))}
      </View>
      {message ? <Banner text={message} tone={tone} /> : null}
      {ready && rows.length === 0 ? (
        <Empty title="Nothing here" detail="When a home writes in, it shows up here." />
      ) : null}
      {rows.map((row) => {
        const busy = busyId === row.id;
        const reply = replyDraft[row.id] ?? "";
        const assignee = assigneeDraft[row.id] ?? row.assigneeId ?? people[0]?.id ?? "";
        return (
          <Panel key={row.id}>
            <Text style={ui.label}>{row.statusLabel}{row.home ? ` · ${row.home}` : ""} · {row.date}</Text>
            <Text style={ui.cardTitle}>{row.who}</Text>
            {row.assigneeName ? <Text style={ui.meta}>With {row.assigneeName}</Text> : null}
            {row.imageUrl ? (
              <Image source={{ uri: row.imageUrl }} style={{ width: "100%", height: 180, borderRadius: 16, marginTop: 8 }} resizeMode="cover" />
            ) : null}
            {row.messages.slice(-6).map((line) => (
              <View key={`${row.id}-${line.id}`} style={{ gap: 2, marginTop: 6 }}>
                <Text style={ui.label}>{line.who}</Text>
                <Text style={ui.body}>{line.body}</Text>
              </View>
            ))}
            <View style={{ gap: 10, marginTop: 8 }}>
              {row.status !== "done" ? (
                <>
                  <TextInput
                    value={reply}
                    onChangeText={(value) => setReplyDraft((current) => ({ ...current, [row.id]: value }))}
                    placeholder="Write back"
                    placeholderTextColor={colors.placeholder}
                    style={[ui.field, { backgroundColor: colors.page, borderWidth: 0, minHeight: 72 }]}
                    multiline
                  />
                  <Pressable
                    disabled={Boolean(busyId)}
                    onPress={() => {
                      if (reply.trim().length < 1) {
                        setTone("error");
                        setMessage("Write a reply first.");
                        return;
                      }
                      run(row.id, () => officeRequestAction({ action: "reply", noteId: row.id, reply }));
                    }}
                    style={ui.button}
                  >
                    <Text style={ui.buttonText}>{busy ? "Saving…" : "Send reply"}</Text>
                  </Pressable>
                </>
              ) : null}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {STATUSES.map((item) => (
                  <Pressable
                    key={item.value}
                    disabled={Boolean(busyId)}
                    onPress={() => setStatus(row, item.value)}
                    style={[
                      ui.button,
                      {
                        paddingHorizontal: 12,
                        backgroundColor: row.status === item.value ? colors.button : colors.white,
                        borderWidth: 1,
                        borderColor: colors.button,
                      },
                    ]}
                  >
                    <Text style={[ui.buttonText, { color: row.status === item.value ? colors.onButton : colors.button, fontSize: 13 }]}>
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {row.status !== "done" && people.length ? (
                <View style={{ gap: 8 }}>
                  <Text style={ui.label}>Assign</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {people.map((person) => (
                      <Pressable
                        key={person.id}
                        onPress={() => setAssigneeDraft((current) => ({ ...current, [row.id]: person.id }))}
                        style={[
                          ui.button,
                          {
                            paddingHorizontal: 12,
                            backgroundColor: assignee === person.id ? colors.brandSoft : colors.white,
                            borderWidth: 1,
                            borderColor: colors.line,
                          },
                        ]}
                      >
                        <Text style={[ui.buttonText, { color: colors.ink, fontSize: 13 }]}>{person.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Pressable
                    disabled={Boolean(busyId) || !assignee}
                    onPress={() => run(row.id, () => officeRequestAction({ action: "assign", noteId: row.id, assignee }))}
                    style={[ui.button, { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.button }]}
                  >
                    <Text style={[ui.buttonText, { color: colors.button }]}>{busy ? "Saving…" : "Assign"}</Text>
                  </Pressable>
                </View>
              ) : null}
              {row.status !== "done" && canOpenJob ? (
                <Pressable
                  disabled={Boolean(busyId)}
                  onPress={() => run(row.id, () => officeRequestAction({
                    action: "job",
                    noteId: row.id,
                    title: row.body.slice(0, 80),
                    place: row.home,
                    body: row.body,
                  }))}
                  style={[ui.button, { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.button }]}
                >
                  <Text style={[ui.buttonText, { color: colors.button }]}>
                    {busy ? "Saving…" : row.jobId ? "Update linked job" : "Turn into a job"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </Panel>
        );
      })}
    </Screen>
  );
}
