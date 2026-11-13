import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { CallButton } from "@/components/CallButton";
import { Note, Screen } from "@/components/Screen";
import { lookupPass, setGateStatus } from "@/lib/community";
import { lookupWorkforceCode } from "@/lib/business";
import { planDayLabel } from "@/lib/day";
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

type HelperPass = Awaited<ReturnType<typeof lookupWorkforceCode>>;

export default function CheckScreen() {
  const { code, walkin } = useLocalSearchParams<{ code: string; walkin?: string }>();
  const [result, setResult] = useState<Awaited<ReturnType<typeof lookupPass>> | null>(null);
  const [helper, setHelper] = useState<HelperPass | null>(null);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setReady(false);
    setHelper(null);
    const passCode = String(code || "");
    try {
      const next = await lookupPass(passCode);
      if (next?.found) {
        setResult(next);
        if (walkin === "1" && next.status === "waiting" && next.answer !== "allowed") {
          setMessage("Home notified. Wait for them to allow this guest.");
        } else {
          setMessage("");
        }
        setReady(true);
        return Boolean(next.valid);
      }
    } catch {
      // Fall through to helper pass lookup.
    }
    try {
      const workforce = await lookupWorkforceCode(passCode);
      setResult(null);
      setHelper(workforce);
      setMessage(workforce.allowed
        ? "Helper pass is valid for entry."
        : workforce.blacklisted
          ? "This helper is blacklisted. Do not allow entry."
          : "Helper pass is not active for a home.");
      setReady(true);
      return workforce.allowed;
    } catch (error) {
      setResult({ found: false, valid: false });
      setHelper(null);
      setMessage(error instanceof Error ? error.message : "This pass was not verified.");
      setReady(true);
      return false;
    }
  }, [code, walkin]);

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
  const helperOk = Boolean(helper?.allowed);
  const title = !ready
    ? "Checking"
    : helper
      ? (helperOk ? "Helper pass valid" : "Helper not allowed")
      : ok
        ? "Pass valid"
        : result?.found
          ? (STATUS[String(result.status)] || "Pass not valid")
          : result
            ? "Pass not valid"
            : "Not verified";

  return (
    <Screen
      title={title}
      busy={!ready && !message}
      onRefresh={async () => { await load(); }}
    >
      {ready && !helper && result && !result.found ? <Text style={ui.body}>No pass matches that code.</Text> : null}
      {helper ? (
        <View style={ui.card}>
          <Text style={ui.label}>{helper.kind}{helper.blacklisted ? " · blacklisted" : ""}</Text>
          <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 28, fontWeight: "600", letterSpacing: 2 }}>{helper.code}</Text>
          <Text style={ui.cardTitle}>{helper.name}</Text>
          <Text style={ui.body}>{helper.home || "No home link"}{helper.phone ? ` · ${helper.phone}` : ""}</Text>
          {helperOk ? (
            <Text style={ui.body}>Allow this helper in. No visitor pass entry/exit recording needed.</Text>
          ) : (
            <Text style={ui.body}>Do not let this person in on this pass.</Text>
          )}
          {helper.home ? (
            <CallButton home={String(helper.home)} which="owner" label="Call this home" showNumber={false} />
          ) : null}
        </View>
      ) : null}
      {result?.found ? (
        <View style={ui.card}>
          <Text style={ui.label}>{STATUS[String(result.status)] || String(result.status)}</Text>
          <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 28, fontWeight: "600", letterSpacing: 2 }}>{result.code}</Text>
          <Text style={ui.cardTitle}>{result.name}</Text>
          <Text style={ui.body}>{result.home} · {planDayLabel(String(result.date || "")) || result.date}</Text>
          <Text style={ui.body}>{result.purpose}</Text>
          {result.answer === "allowed" ? <Text style={ui.body}>The resident allowed this visitor in.</Text> : null}
          {!ok && result.status === "waiting" && result.answer !== "allowed" ? (
            <Text style={ui.body}>Wait for the resident to allow this visitor.</Text>
          ) : !ok && result.status !== "left" ? (
            <Text style={ui.body}>Do not let this visitor in.</Text>
          ) : null}
          {result.home ? (
            <CallButton home={String(result.home)} which="owner" label="Call this home" showNumber={false} />
          ) : null}
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
      {message ? (
        <Note
          text={message}
          tone={
            message.endsWith("recorded.")
            || message.endsWith("told.")
            || message.startsWith("Home notified")
            || message.includes("valid for entry")
              ? "ok"
              : "error"
          }
        />
      ) : null}
    </Screen>
  );
}
