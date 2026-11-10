import { useCallback, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Banner, Empty, Panel } from "@/components/Blocks";
import { Screen } from "@/components/Screen";
import { decideApproval, loadApprovals, type ApprovalRequest } from "@/lib/office";
import { colors, ui } from "@/theme";

export default function ApprovalsScreen() {
  const [waiting, setWaiting] = useState<ApprovalRequest[]>([]);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"error" | "ok">("error");
  const [ready, setReady] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await loadApprovals();
      setWaiting(data.waiting);
      setMessage("");
    } catch (error) {
      setWaiting([]);
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Could not load approvals.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function act(id: number, action: "approve" | "reject") {
    if (busyId) return;
    if (action === "reject" && reason.trim().length < 3) {
      setTone("error");
      setMessage("Type a short reason before rejecting.");
      return;
    }
    setBusyId(id);
    setMessage("");
    try {
      const result = await decideApproval({
        id,
        action,
        reason: action === "reject" ? reason : undefined,
      });
      setTone("ok");
      setMessage(result.message);
      setRejectId(null);
      setReason("");
      await load();
    } catch (error) {
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Could not update that request.");
    } finally {
      setBusyId(null);
    }
  }

  function askApprove(row: ApprovalRequest) {
    Alert.alert("Approve this join request?", `${row.name} · ${row.home}`, [
      { text: "Cancel", style: "cancel" },
      { text: "Approve", onPress: () => act(row.id, "approve") },
    ]);
  }

  return (
    <Screen title="Approvals" onRefresh={load} busy={!ready && !message}>
      <Text style={ui.body}>People waiting to join a flat. Approve to open their home, or reject with a short reason.</Text>
      {message ? <Banner text={message} tone={tone} /> : null}
      {ready && waiting.length === 0 ? (
        <Empty title="No one is waiting" detail="When someone asks to join a flat, they show up here." />
      ) : null}
      {waiting.map((row) => {
        const busy = busyId === row.id;
        return (
          <Panel key={row.id}>
            <Text style={ui.label}>{row.kind} · {row.home}</Text>
            <Text style={ui.cardTitle}>{row.name}</Text>
            {row.phone ? <Text style={ui.body}>{row.phone}</Text> : null}
            {row.email ? <Text style={ui.meta}>{row.email}</Text> : null}
            {rejectId === row.id ? (
              <View style={{ gap: 10 }}>
                <TextInput
                  value={reason}
                  onChangeText={setReason}
                  placeholder="Reason for rejecting"
                  placeholderTextColor={colors.placeholder}
                  style={[ui.field, { backgroundColor: colors.page, borderWidth: 0 }]}
                  multiline
                />
                <Pressable disabled={busy} onPress={() => act(row.id, "reject")} style={ui.button}>
                  <Text style={ui.buttonText}>{busy ? "Saving…" : "Confirm reject"}</Text>
                </Pressable>
                <Pressable disabled={busy} onPress={() => { setRejectId(null); setReason(""); }} style={[ui.button, { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.button }]}>
                  <Text style={[ui.buttonText, { color: colors.button }]}>Cancel</Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable disabled={Boolean(busyId)} onPress={() => askApprove(row)} style={[ui.button, { flex: 1 }]}>
                  <Text style={ui.buttonText}>{busy ? "Saving…" : "Approve"}</Text>
                </Pressable>
                <Pressable
                  disabled={Boolean(busyId)}
                  onPress={() => { setRejectId(row.id); setReason(""); }}
                  style={[ui.button, { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.button }]}
                >
                  <Text style={[ui.buttonText, { color: colors.button }]}>Reject</Text>
                </Pressable>
              </View>
            )}
          </Panel>
        );
      })}
    </Screen>
  );
}
