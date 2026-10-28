import { useCallback, useState } from "react";
import { Linking, Pressable, Share, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Loading, Note, Screen } from "@/components/Screen";
import { answerArrival, cancelPass, decidePass, loadPass } from "@/lib/community";
import { passShareMessage, passShareUrl } from "@/lib/site";
import { colors, fonts, ui } from "@/theme";

const STATUS: Record<string, string> = {
  pending_approval: "Waiting for you",
  expected: "Expected",
  waiting: "Waiting at the gate",
  inside: "Inside",
  left: "Left",
  refused: "Refused",
  cancelled: "Cancelled",
};

export default function PassScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pass, setPass] = useState<Awaited<ReturnType<typeof loadPass>>>(null);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setPass(await loadPass(Number(id)));
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load the pass.");
    } finally {
      setReady(true);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function act(run: () => Promise<void>) {
    if (saving) return;
    setSaving(true);
    setMessage("");
    try {
      await run();
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update the pass.");
    } finally {
      setSaving(false);
    }
  }

  async function share() {
    if (!pass) return;
    const text = passShareMessage({
      code: String(pass.code),
      visitorName: String(pass.visitor_name),
      home: String(pass.flat_number || ""),
      date: String(pass.visit_on || ""),
    });
    await Share.share({ message: text, url: passShareUrl(String(pass.code)) }).catch(() => undefined);
  }

  async function whatsapp() {
    if (!pass) return;
    const text = passShareMessage({
      code: String(pass.code),
      visitorName: String(pass.visitor_name),
      home: String(pass.flat_number || ""),
      date: String(pass.visit_on || ""),
    });
    const phone = String(pass.visitor_phone || "").replace(/\D/g, "");
    const target = phone
      ? `https://wa.me/91${phone.slice(-10)}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    await Linking.openURL(target).catch(() => undefined);
  }

  return (
    <Screen title="Visitor pass" onRefresh={load}>
      {!ready ? <Loading /> : null}
      {pass ? (
        <View style={ui.card}>
          <Text style={ui.label}>{STATUS[String(pass.status)] || String(pass.status)}</Text>
          <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 32, fontWeight: "600", letterSpacing: 3 }}>{pass.code}</Text>
          <Text style={ui.cardTitle}>{pass.visitor_name}</Text>
          <Text style={ui.body}>{pass.flat_number} · {pass.visit_on}</Text>
          {pass.purpose ? <Text style={ui.body}>{pass.purpose}</Text> : null}
          {pass.visitor_phone ? <Text style={ui.body}>{pass.visitor_phone}</Text> : null}
          {pass.host_answer === "allowed" ? <Text style={ui.body}>You allowed this visitor in.</Text> : null}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable onPress={share} style={[ui.button, { flex: 1 }]}>
              <Text style={ui.buttonText}>Share</Text>
            </Pressable>
            <Pressable onPress={whatsapp} style={[ui.button, { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.button }]}>
              <Text style={[ui.buttonText, { color: colors.button }]}>WhatsApp</Text>
            </Pressable>
          </View>
          {pass.status === "waiting" ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable disabled={saving} onPress={() => act(() => answerArrival(Number(pass.id), true))} style={[ui.button, { flex: 1 }]}>
                <Text style={ui.buttonText}>Let them in</Text>
              </Pressable>
              <Pressable disabled={saving} onPress={() => act(() => answerArrival(Number(pass.id), false))} style={[ui.button, { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.button }]}>
                <Text style={[ui.buttonText, { color: colors.button }]}>Send away</Text>
              </Pressable>
            </View>
          ) : null}
          {pass.status === "pending_approval" ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable onPress={() => act(() => decidePass(pass.id, "expected"))} style={[ui.button, { flex: 1 }]}>
                <Text style={ui.buttonText}>Allow</Text>
              </Pressable>
              <Pressable onPress={() => act(() => decidePass(pass.id, "refused"))} style={[ui.button, { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.button }]}>
                <Text style={[ui.buttonText, { color: colors.button }]}>Refuse</Text>
              </Pressable>
            </View>
          ) : null}
          {pass.status === "expected" || pass.status === "pending_approval" || pass.status === "waiting" ? (
            <Pressable onPress={() => act(() => cancelPass(Number(pass.id)))} style={ui.quiet}>
              <Text style={ui.quietText}>Cancel pass</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {ready && !pass && !message ? <Text style={ui.body}>This pass is not available.</Text> : null}
      {message ? <Note text={message} /> : null}
    </Screen>
  );
}
