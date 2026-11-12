import { useCallback, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { HtmlBody } from "@/components/HtmlText";
import { Note, Screen } from "@/components/Screen";
import { loadGatePasses, loadHelp } from "@/lib/community";
import { colors, ui } from "@/theme";

function PassRow({
  pass,
  onPress,
}: {
  pass: { id: number; visitor_name: string; flat_number: string; code: string; purpose?: string | null }
  onPress: () => void
}) {
  const purpose = String(pass.purpose || "").trim();
  return (
    <Pressable onPress={onPress} style={ui.card}>
      <Text style={ui.cardTitle}>{pass.visitor_name}</Text>
      <Text style={ui.body}>
        {pass.flat_number} · {pass.code}{purpose ? ` · ${purpose}` : ""}
      </Text>
    </Pressable>
  );
}

export default function GateScreen() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [expected, setExpected] = useState<Awaited<ReturnType<typeof loadGatePasses>>["expected"]>([]);
  const [pending, setPending] = useState<Awaited<ReturnType<typeof loadGatePasses>>["pending"]>([]);
  const [waiting, setWaiting] = useState<Awaited<ReturnType<typeof loadGatePasses>>["waiting"]>([]);
  const [inside, setInside] = useState<Awaited<ReturnType<typeof loadGatePasses>>["inside"]>([]);
  const [offline, setOffline] = useState(false);
  const [help, setHelp] = useState("");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      const [passes, notes] = await Promise.all([loadGatePasses(), loadHelp()]);
      setExpected(passes.expected);
      setPending(passes.pending);
      setWaiting(passes.waiting);
      setInside(passes.inside);
      setOffline(Boolean(passes.offline));
      setHelp(notes.rules || notes.contacts);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load the gate.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function check(value: string) {
    const next = value.trim().toUpperCase();
    if (next.length < 4) {
      setMessage("Enter the pass code.");
      return;
    }
    router.push(`/(security)/check?code=${encodeURIComponent(next)}`);
  }

  const quiet = ready && pending.length === 0 && waiting.length === 0 && expected.length === 0 && inside.length === 0;

  return (
    <Screen title="Security Gate" showBack={false} onRefresh={load} busy={!ready && !message}>
      <Text style={ui.body}>Scan a QR, notify the home, or call a flat.</Text>
      <Pressable onPress={() => router.push("/(security)/scan")} style={ui.button}>
        <Text style={ui.buttonText}>Scan QR pass</Text>
      </Pressable>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable
          onPress={() => router.push("/(security)/walk-in?purpose=Guest")}
          style={[ui.button, { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.button }]}
        >
          <Text style={[ui.buttonText, { color: colors.button }]}>Guest</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/(security)/walk-in?purpose=Delivery")}
          style={[ui.button, { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.button }]}
        >
          <Text style={[ui.buttonText, { color: colors.button }]}>Delivery</Text>
        </Pressable>
      </View>
      <Pressable
        onPress={() => router.push("/(security)/directory")}
        style={[ui.button, { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.button }]}
      >
        <Text style={[ui.buttonText, { color: colors.button }]}>Call a home</Text>
      </Pressable>
      <Text style={ui.label}>Or type the code</Text>
      <TextInput
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        placeholder="Pass code"
        placeholderTextColor={colors.placeholder}
        style={ui.field}
      />
      <Pressable onPress={() => check(code)} style={[ui.button, { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.button }]}>
        <Text style={[ui.buttonText, { color: colors.button }]}>Check pass</Text>
      </Pressable>
      {offline ? <Note text="Showing the last saved gate list. Connection is weak." /> : null}
      {message ? <Note text={message} /> : null}
      {quiet ? <Text style={ui.body}>Quiet right now. Scan a QR, or tap Guest / Delivery for someone without a pass.</Text> : null}
      {pending.length > 0 ? <Text style={ui.label}>Waiting for the resident</Text> : null}
      {pending.map((pass) => (
        <PassRow key={pass.id} pass={pass} onPress={() => check(String(pass.code))} />
      ))}
      {waiting.length > 0 ? <Text style={ui.label}>At the gate</Text> : null}
      {waiting.map((pass) => (
        <PassRow key={pass.id} pass={pass} onPress={() => check(String(pass.code))} />
      ))}
      {inside.length > 0 ? <Text style={ui.label}>Inside now</Text> : null}
      {inside.map((pass) => (
        <PassRow key={pass.id} pass={pass} onPress={() => check(String(pass.code))} />
      ))}
      {expected.length > 0 ? <Text style={ui.label}>Expected today</Text> : null}
      {expected.map((pass) => (
        <PassRow key={pass.id} pass={pass} onPress={() => check(String(pass.code))} />
      ))}
      <Text style={ui.label}>Emergency</Text>
      {help ? <HtmlBody html={help} /> : <Text style={ui.body}>The office has not published emergency instructions yet.</Text>}
    </Screen>
  );
}
