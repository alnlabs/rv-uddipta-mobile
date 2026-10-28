import { useCallback, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Loading, Masthead, Note, Screen } from "@/components/Screen";
import { loadGatePasses, loadHelp } from "@/lib/community";
import { colors, ui } from "@/theme";

export default function GateScreen() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [expected, setExpected] = useState<Awaited<ReturnType<typeof loadGatePasses>>["expected"]>([]);
  const [pending, setPending] = useState<Awaited<ReturnType<typeof loadGatePasses>>["pending"]>([]);
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

  const quiet = ready && pending.length === 0 && expected.length === 0 && inside.length === 0;

  return (
    <Screen hero onRefresh={load}>
      <Masthead title="Gate" detail="Scan or type the pass code. A missing result is not an entry." />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={() => router.push("/(security)/scan")} style={[ui.button, { flex: 1 }]}>
          <Text style={ui.buttonText}>Scan</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/(security)/walk-in")} style={[ui.button, { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.button }]}>
          <Text style={[ui.buttonText, { color: colors.button }]}>Walk-in</Text>
        </Pressable>
      </View>
      <TextInput
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        placeholder="Pass code"
        placeholderTextColor={colors.placeholder}
        style={ui.field}
      />
      <Pressable onPress={() => check(code)} style={ui.button}>
        <Text style={ui.buttonText}>Check pass</Text>
      </Pressable>
      {offline ? <Note text="Showing the last saved gate list. Connection is weak." /> : null}
      {message ? <Note text={message} /> : null}
      {!ready ? <Loading /> : null}
      {quiet ? <Text style={ui.body}>No expected visitors right now. Use Scan or Walk-in when someone arrives.</Text> : null}
      {pending.length > 0 ? <Text style={ui.label}>Waiting for the resident</Text> : null}
      {pending.map((pass) => (
        <Pressable key={pass.id} onPress={() => check(String(pass.code))} style={ui.card}>
          <Text style={ui.cardTitle}>{pass.visitor_name}</Text>
          <Text style={ui.body}>{pass.flat_number} · {pass.code}</Text>
        </Pressable>
      ))}
      {inside.length > 0 ? <Text style={ui.label}>Inside now</Text> : null}
      {inside.map((pass) => (
        <Pressable key={pass.id} onPress={() => check(String(pass.code))} style={ui.card}>
          <Text style={ui.cardTitle}>{pass.visitor_name}</Text>
          <Text style={ui.body}>{pass.flat_number} · {pass.code}</Text>
        </Pressable>
      ))}
      {expected.length > 0 ? <Text style={ui.label}>Expected today</Text> : null}
      {expected.map((pass) => (
        <Pressable key={pass.id} onPress={() => check(String(pass.code))} style={ui.card}>
          <Text style={ui.cardTitle}>{pass.visitor_name}</Text>
          <Text style={ui.body}>{pass.flat_number} · {pass.code}</Text>
        </Pressable>
      ))}
      <Text style={ui.label}>Emergency</Text>
      <Text style={ui.body}>{help || "The office has not published emergency instructions yet."}</Text>
    </Screen>
  );
}
