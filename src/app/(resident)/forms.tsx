import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Banner, Empty, PageTitle, SectionLabel } from "@/components/Blocks";
import { Loading, Screen } from "@/components/Screen";
import { loadForms, type CommunityForm } from "@/lib/feed";
import { colors, fonts, ui } from "@/theme";

function FormRow({ form, onPress }: { form: CommunityForm; onPress: () => void }) {
  const status = form.closed ? "Closed" : form.submitted ? "Sent" : "Open";
  const tone = form.closed ? colors.muted : form.submitted ? colors.gold : colors.goldInk;
  return (
    <Pressable onPress={onPress} style={[ui.surface, { padding: 16, gap: 8 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tone }} />
        <Text style={{ color: tone, fontFamily: fonts.display, fontSize: 12, fontWeight: "600" }}>{status}</Text>
      </View>
      <Text style={ui.cardTitle}>{form.title}</Text>
      {form.note ? <Text style={ui.meta} numberOfLines={2}>{form.note}</Text> : null}
    </Pressable>
  );
}

export default function FormsScreen() {
  const router = useRouter();
  const [forms, setForms] = useState<CommunityForm[]>([]);
  const [available, setAvailable] = useState(true);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await loadForms();
      setForms(result.forms);
      setAvailable(result.access !== "none");
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load forms.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const open = forms.filter((form) => !form.closed && !form.submitted);
  const sent = forms.filter((form) => !form.closed && form.submitted);
  const closed = forms.filter((form) => form.closed);

  return (
    <Screen onRefresh={load}>
      <PageTitle kicker="Community" title="Forms" detail="Each home sends one answer. Sending again updates that answer." />
      {message ? <Banner text={message} /> : null}
      {!ready ? <Loading /> : null}
      {ready && !available ? <Empty title="Forms unavailable" detail="Forms are not available on your account." /> : null}
      {ready && available && forms.length === 0 ? <Empty title="No forms yet" detail="A form from the office will appear in its own card." /> : null}
      {open.length ? <SectionLabel title="Waiting for your home" /> : null}
      {open.map((form) => (
        <FormRow key={form.id} form={form} onPress={() => router.push(`/(resident)/form/${form.id}`)} />
      ))}
      {sent.length ? <SectionLabel title="Sent" /> : null}
      {sent.map((form) => (
        <FormRow key={form.id} form={form} onPress={() => router.push(`/(resident)/form/${form.id}`)} />
      ))}
      {closed.length ? <SectionLabel title="Closed" /> : null}
      {closed.map((form) => (
        <FormRow key={form.id} form={form} onPress={() => router.push(`/(resident)/form/${form.id}`)} />
      ))}
    </Screen>
  );
}
