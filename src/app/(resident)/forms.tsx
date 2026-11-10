import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Banner, Empty, SectionLabel, TextButton } from "@/components/Blocks";
import { HtmlBody } from "@/components/HtmlText";
import { Screen } from "@/components/Screen";
import { loadForms, type CommunityForm } from "@/lib/feed";
import { colors, fonts, ui } from "@/theme";

function QueryRow({ form, onPress }: { form: CommunityForm; onPress: () => void }) {
  const status = form.closed ? "Closed" : form.submitted ? "Sent" : "Open";
  const tone = form.closed ? colors.muted : form.submitted ? colors.gold : colors.goldInk;
  return (
    <Pressable onPress={onPress} style={[ui.surface, { padding: 16, gap: 8 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tone }} />
        <Text style={{ color: tone, fontFamily: fonts.display, fontSize: 12, fontWeight: "600" }}>{status}</Text>
      </View>
      <Text style={ui.cardTitle}>{form.title}</Text>
      {form.note ? <HtmlBody html={form.note} lines={2} style={ui.meta} /> : null}
    </Pressable>
  );
}

export default function QueriesScreen() {
  const router = useRouter();
  const [forms, setForms] = useState<CommunityForm[]>([]);
  const [available, setAvailable] = useState(true);
  const [canCreate, setCanCreate] = useState(false);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await loadForms();
      setForms(result.forms);
      setAvailable(result.access !== "none");
      setCanCreate(Boolean(result.canCreate));
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load queries.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const open = forms.filter((form) => !form.closed && !form.submitted);
  const sent = forms.filter((form) => !form.closed && form.submitted);
  const closed = forms.filter((form) => form.closed);

  return (
    <Screen
      busy={!ready && !message}
      title="Queries"
      onRefresh={load}
      action={canCreate ? <TextButton label="New"
      onPress={() => router.push("/(resident)/query/new")} /> : undefined}
    >
      <Text style={ui.body}>Each home sends one answer. Sending again updates that answer.</Text>
      {message ? <Banner text={message} /> : null}
      {ready && !available ? <Empty title="Queries unavailable" detail="Queries are not available on your account." /> : null}
      {ready && available && forms.length === 0 ? (
        <Empty
          title="No queries yet"
          detail={canCreate ? "Tap New to ask every home a question." : "A query from the office will appear in its own card."}
        />
      ) : null}
      {open.length ? <SectionLabel title="Waiting for your home" /> : null}
      {open.map((form) => (
        <QueryRow key={form.id} form={form} onPress={() => router.push(`/(resident)/form/${form.id}`)} />
      ))}
      {sent.length ? <SectionLabel title="Sent" /> : null}
      {sent.map((form) => (
        <QueryRow key={form.id} form={form} onPress={() => router.push(`/(resident)/form/${form.id}`)} />
      ))}
      {closed.length ? <SectionLabel title="Closed" /> : null}
      {closed.map((form) => (
        <QueryRow key={form.id} form={form} onPress={() => router.push(`/(resident)/form/${form.id}`)} />
      ))}
    </Screen>
  );
}
