import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Back, Loading, Note, Screen } from "@/components/Screen";
import { lookupPass, setGateStatus } from "@/lib/community";
import { colors, fonts, ui } from "@/theme";

const STATUS: Record<string, string> = {
  pending_approval: "Waiting for the resident",
  expected: "Expected",
  waiting: "At the gate",
  inside: "Inside",
  left: "Left",
  refused: "Refused",
  cancelled: "Cancelled",
};

export default function CheckScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const [result, setResult] = useState<Awaited<ReturnType<typeof lookupPass>> | null>(null);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setReady(false);
    try {
      setResult(await lookupPass(String(code || "")));
      setReady(true);
      return true;
    } catch (error) {
      setResult(null);
      setMessage(error instanceof Error ? error.message : "This pass was not verified.");
      setReady(true);
      return false;
    }
  }, [code]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function record(status: "waiting" | "inside" | "left") {
    if (saving || !result?.id || !result.valid) return;
    setSaving(true);
    setMessage("");
    try {
      await setGateStatus(result.id, status);
      const refreshed = await load();
      if (refreshed) {
        setMessage(status === "left" ? "Exit recorded." : status === "inside" ? "Entry recorded." : "The resident has been told.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "That was not recorded.");
    } finally {
      setSaving(false);
    }
  }

  const ok = Boolean(result?.found && result.valid);
  const title = !ready
    ? "Checking"
    : ok
      ? "Pass valid"
      : result?.found
        ? (STATUS[String(result.status)] || "Pass not valid")
        : result
          ? "Pass not valid"
          : "Not verified";

  return (
    <Screen onRefresh={async () => { await load(); }}>
      <Back />
      <Text style={ui.eyebrow}>Gate</Text>
      <Text style={ui.title}>{title}</Text>
      {!ready ? <Loading /> : null}
      {ready && result && !result.found ? <Text style={ui.body}>No pass matches that code.</Text> : null}
      {result?.found ? (
        <View style={ui.card}>
          <Text style={ui.label}>{STATUS[String(result.status)] || String(result.status)}</Text>
          <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 28, fontWeight: "600", letterSpacing: 2 }}>{result.code}</Text>
          <Text style={ui.cardTitle}>{result.name}</Text>
          <Text style={ui.body}>{result.home} · {result.date}</Text>
          <Text style={ui.body}>{result.purpose}</Text>
          {result.answer === "allowed" ? <Text style={ui.body}>The resident allowed this visitor in.</Text> : null}
          {!ok && result.status !== "left" ? <Text style={ui.body}>Do not let this visitor in.</Text> : null}
          {ok && result.status === "expected" ? (
            <Pressable disabled={saving} onPress={() => record("waiting")} style={ui.button}>
              <Text style={ui.buttonText}>{saving ? "Saving…" : "Visitor arrived"}</Text>
            </Pressable>
          ) : null}
          {ok && (result.status === "waiting" || result.status === "expected") ? (
            <Pressable disabled={saving} onPress={() => record("inside")} style={ui.button}>
              <Text style={ui.buttonText}>{saving ? "Saving…" : "Record entry"}</Text>
            </Pressable>
          ) : null}
          {ok && result.status === "inside" ? (
            <Pressable disabled={saving} onPress={() => record("left")} style={ui.button}>
              <Text style={ui.buttonText}>{saving ? "Saving…" : "Record exit"}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {message ? <Note text={message} tone={message.endsWith("recorded.") || message.endsWith("told.") ? "ok" : "error"} /> : null}
    </Screen>
  );
}
