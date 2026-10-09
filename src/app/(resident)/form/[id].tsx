import { useCallback, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Banner, Chips, PageTitle, Panel } from "@/components/Blocks";
import { Loading, Screen } from "@/components/Screen";
import { loadForms, submitForm, type CommunityForm } from "@/lib/feed";
import { colors, ui } from "@/theme";

export default function FormScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);
  const [form, setForm] = useState<CommunityForm | null>(null);
  const [flat, setFlat] = useState<string | null>(null);
  const [canSend, setCanSend] = useState(false);
  const [phone, setPhone] = useState("");
  const [values, setValues] = useState<Record<number, string>>({});
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"error" | "ok">("error");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (keepNote = false) => {
    try {
      const result = await loadForms();
      const found = result.forms.find((item) => item.id === id) ?? null;
      setForm(found);
      setFlat(result.flat);
      setCanSend(result.access === "manage");
      if (found) {
        setPhone(found.phone);
        const next: Record<number, string> = {};
        for (const answer of found.answers) next[answer.fieldId] = answer.value;
        setValues(next);
      }
      if (!found) {
        setMessage("This form is not available.");
        setTone("error");
      } else if (!keepNote) setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load that form.");
      setTone("error");
    } finally {
      setReady(true);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function send() {
    if (!form || saving) return;
    setSaving(true);
    setMessage("");
    try {
      for (const field of form.fields) {
        if (field.required && !values[field.id]?.trim()) {
          throw new Error(`Fill in ${field.label}.`);
        }
      }
      const note = await submitForm(
        form.id,
        phone,
        form.fields
          .map((field) => ({ fieldId: field.id, value: values[field.id]?.trim() || "" }))
          .filter((answer) => answer.value),
      );
      setMessage(note);
      setTone("ok");
      await load(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send that.");
      setTone("error");
    } finally {
      setSaving(false);
    }
  }

  const locked = !form || form.closed || !canSend || !flat;

  return (
    <Screen onRefresh={load}>
      <PageTitle kicker="Form" title={form?.title || "Form"} detail={form?.note || undefined} />
      {!ready ? <Loading /> : null}
      {message ? <Banner text={message} tone={tone} /> : null}
      {form?.closed ? <Text style={ui.body}>This form is closed.</Text> : null}
      {form?.submitted && !form.closed ? <Banner text="Your home already sent this. Sending again updates that answer." tone="ok" /> : null}
      {!canSend && form ? <Banner text="You can look at this. You cannot change it." /> : null}
      {!flat && form ? <Banner text="Link a home to this account before sending a form." /> : null}
      {form?.homes != null ? <Text style={ui.meta}>{form.homes} homes have answered.</Text> : null}
      {form ? (
        <>
          <Panel>
            <Text style={ui.label}>Phone for this home</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="10-digit phone number"
              placeholderTextColor={colors.placeholder}
              keyboardType="phone-pad"
              editable={!locked}
              style={[ui.field, { backgroundColor: colors.page, borderWidth: 0 }]}
            />
          </Panel>
          <Panel>
            {form.fields.map((field, index) => (
              <View key={field.id} style={{ gap: 8, paddingTop: index === 0 ? 0 : 12, borderTopWidth: index === 0 ? 0 : 1, borderTopColor: colors.line }}>
                <Text style={ui.label}>{field.label}{field.required ? " · Required" : ""}</Text>
                {field.kind === "choice" ? (
                  <Chips
                    options={field.choices.map((choice) => ({ value: choice, label: choice }))}
                    value={values[field.id] || ""}
                    onChange={(choice) => {
                      if (!locked) setValues({ ...values, [field.id]: choice });
                    }}
                  />
                ) : (
                  <TextInput
                    value={values[field.id] || ""}
                    onChangeText={(value) => setValues({ ...values, [field.id]: value })}
                    placeholder={field.kind === "date" ? "2026-10-12" : ""}
                    placeholderTextColor={colors.placeholder}
                    editable={!locked}
                    multiline={field.kind === "long"}
                    style={[ui.field, { backgroundColor: colors.page, borderWidth: 0 }, field.kind === "long" ? { minHeight: 120, textAlignVertical: "top" } : null]}
                  />
                )}
              </View>
            ))}
          </Panel>
          {!locked ? (
            <Pressable onPress={send} disabled={saving} style={ui.button}>
              <Text style={ui.buttonText}>{saving ? "Sending…" : form.submitted ? "Update answer" : "Send"}</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
