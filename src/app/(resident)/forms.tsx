import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Banner, Empty, SectionLabel, TextButton } from "@/components/Blocks";
import { HtmlBody } from "@/components/HtmlText";
import { Screen } from "@/components/Screen";
import { loadForms, type CommunityForm } from "@/lib/feed";
import { ui } from "@/theme";

function EnquiryRow({ form, onPress }: { form: CommunityForm; onPress: () => void }) {
  const status = form.closed ? "Closed" : form.submitted ? "Sent" : "Open";
  return (
    <Pressable onPress={onPress} style={[ui.surface, { padding: 16, gap: 6 }]}>
      <Text style={ui.meta}>{status}</Text>
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
      setMessage(error instanceof Error ? error.message : "Could not load enquiries.");
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
      title="Enquiries"
      onRefresh={load}
      action={canCreate ? <TextButton label="New"
      onPress={() => router.push("/(resident)/query/new")} /> : undefined}
    >
      <Text style={ui.body}>Each home sends one reply. Sending again updates that reply.</Text>
      {message ? <Banner text={message} /> : null}
      {ready && !available ? <Empty title="Enquiries unavailable" detail="Enquiries are not available on your account." /> : null}
      {ready && available && forms.length === 0 ? (
        <Empty
          title="No enquiries yet"
          detail={canCreate ? "Tap New to ask every home a question." : "An enquiry from the office will appear here."}
        />
      ) : null}
      {open.length ? <SectionLabel title="Open for you" /> : null}
      {open.map((form) => (
        <EnquiryRow key={form.id} form={form} onPress={() => router.push(`/(resident)/form/${form.id}`)} />
      ))}
      {sent.length ? <SectionLabel title="Your replies" /> : null}
      {sent.map((form) => (
        <EnquiryRow key={form.id} form={form} onPress={() => router.push(`/(resident)/form/${form.id}`)} />
      ))}
      {closed.length ? <SectionLabel title="Closed" /> : null}
      {closed.map((form) => (
        <EnquiryRow key={form.id} form={form} onPress={() => router.push(`/(resident)/form/${form.id}`)} />
      ))}
    </Screen>
  );
}
