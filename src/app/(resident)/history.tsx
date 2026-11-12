import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Empty, TextButton } from "@/components/Blocks";
import { Note, Screen } from "@/components/Screen";
import { loadPasses } from "@/lib/community";
import { fonts, ui } from "@/theme";

export default function HistoryScreen() {
  const router = useRouter();
  const [passes, setPasses] = useState<Awaited<ReturnType<typeof loadPasses>>["passes"]>([]);
  const [canCreate, setCanCreate] = useState(false);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await loadPasses();
      setPasses(data.passes);
      setCanCreate(data.canCreate);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load visitor history.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen
      busy={!ready && !message}
      title="Visitors"
      onRefresh={load}
      action={canCreate ? (
        <TextButton label="Invite" onPress={() => router.push("/(resident)/invite")} />
      ) : undefined}
    >
      {message ? <Note text={message} /> : null}

      {canCreate ? (
        <Pressable
          onPress={() => router.push("/(resident)/invite")}
          style={[ui.button, { marginBottom: 4 }]}
        >
          <Text style={ui.buttonText}>Create gate pass</Text>
        </Pressable>
      ) : null}

      {ready && passes.length === 0 ? (
        <Empty
          title="No passes yet"
          detail={canCreate
            ? "Create a QR pass for a guest, delivery, or service visit."
            : "Visitor passes appear here once your flat can invite guests."}
        />
      ) : null}

      {passes.map((pass) => (
        <Pressable key={pass.id} onPress={() => router.push(`/(resident)/pass/${pass.id}`)} style={ui.card}>
          <Text style={ui.label}>{pass.status} · {pass.date}</Text>
          <Text style={ui.cardTitle}>{pass.name}</Text>
          <Text style={ui.body}>{pass.code} · {pass.home}</Text>
        </Pressable>
      ))}

      {ready && canCreate && passes.length > 0 ? (
        <View style={{ paddingTop: 4 }}>
          <Text style={{ color: "#64748b", fontFamily: fonts.body, fontSize: 13 }}>
            Tip: use Invite in the header for another guest.
          </Text>
        </View>
      ) : null}
    </Screen>
  );
}
