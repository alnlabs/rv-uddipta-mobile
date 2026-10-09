import { useCallback, useState } from "react";
import { Pressable, Text, TextInput } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Loading, Masthead, Note, Screen } from "@/components/Screen";
import { loadGatePasses, loadHelp } from "@/lib/community";
import { colors, ui } from "@/theme";

export default function GateScreen() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [expected, setExpected] = useState<Awaited<ReturnType<typeof loadGatePasses>>["expected"]>([]);
  const [pending, setPending] = useState<Awaited<ReturnType<typeof loadGatePasses>>["pending"]>([]);
  const [help, setHelp] = useState("");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      const [passes, notes] = await Promise.all([loadGatePasses(), loadHelp()]);
      setExpected(passes.expected);
      setPending(passes.pending);
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

  return (
    <Screen hero onRefresh={load}>
      <Masthead title="Gate" detail="Type the code on the pass. A missing result is not an entry." />
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
      <Text style={ui.body}>The camera scanner needs an installed build. This screen checks the code with the community records.</Text>
      {message ? <Note text={message} /> : null}
      {!ready ? <Loading /> : null}
      {pending.length > 0 ? <Text style={ui.label}>Waiting for the resident</Text> : null}
      {pending.map((pass) => (
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
