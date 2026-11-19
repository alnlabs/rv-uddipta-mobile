import { useCallback, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Banner, Panel, SectionLabel } from "@/components/Blocks";
import { HtmlBody } from "@/components/HtmlText";
import { Screen } from "@/components/Screen";
import {
  loadForms,
  submitForm,
  type CommunityForm,
  type FormCommunityAnswer,
  type FormField,
} from "@/lib/feed";
import { colors, fonts, ui } from "@/theme";

function byFlat(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true });
}

function normalizeDate(raw: string) {
  const value = raw.trim();
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const india = value.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (india) {
    const day = india[1].padStart(2, "0");
    const month = india[2].padStart(2, "0");
    return `${india[3]}-${month}-${day}`;
  }
  const western = value.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (western) {
    return `${western[1]}-${western[2].padStart(2, "0")}-${western[3].padStart(2, "0")}`;
  }
  return value;
}

function FieldAnswer({
  field,
  value,
  locked,
  onChange,
}: {
  field: FormField
  value: string
  locked: boolean
  onChange: (next: string) => void
}) {
  if (field.kind === "choice") {
    if (!field.choices.length) {
      return <Text style={ui.body}>This question has no options yet. Ask the office to add choices.</Text>;
    }
    return (
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {field.choices.map((choice) => {
          const active = value === choice;
          return (
            <Pressable
              key={choice}
              disabled={locked}
              onPress={() => onChange(choice)}
              style={{
                minHeight: 36,
                paddingHorizontal: 14,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: active ? "rgba(5, 150, 105, 0.12)" : colors.white,
                borderWidth: 1,
                borderColor: active ? "#059669" : "rgba(15, 23, 42, 0.14)",
              }}
            >
              <Text
                style={{
                  color: active ? "#047857" : "#334155",
                  fontFamily: fonts.display,
                  fontSize: 14,
                  fontWeight: active ? "700" : "500",
                }}
              >
                {choice}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }
  if (field.kind === "date") {
    return (
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.placeholder}
        editable={!locked}
        autoCapitalize="none"
        style={{
          minHeight: 44,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: "rgba(15, 23, 42, 0.18)",
          fontFamily: fonts.body,
          fontSize: 16,
          color: colors.ink,
        }}
      />
    );
  }
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={field.kind === "long" ? "Write your reply" : "Your reply"}
      placeholderTextColor={colors.placeholder}
      editable={!locked}
      multiline={field.kind === "long"}
      style={{
        minHeight: field.kind === "long" ? 96 : 44,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(15, 23, 42, 0.18)",
        fontFamily: fonts.body,
        fontSize: 16,
        color: colors.ink,
        textAlignVertical: field.kind === "long" ? "top" : "center",
      }}
    />
  );
}

function FormResults({
  fields,
  community,
  flat,
}: {
  fields: FormField[]
  community: FormCommunityAnswer[]
  flat: string | null
}) {
  const people = [...community].sort((a, b) => byFlat(a.flatNumber, b.flatNumber));
  if (!people.length) {
    return (
      <Panel>
        <Text style={ui.cardTitle}>No replies yet</Text>
        <Text style={ui.body}>When homes send replies, they show up here question by question.</Text>
      </Panel>
    );
  }

  return (
    <View style={{ gap: 14 }}>
      <SectionLabel title={`${people.length} ${people.length === 1 ? "home has" : "homes have"} answered`} />
      {fields.map((field) => {
        const rows = people
          .map((answer) => ({
            flat: answer.flatNumber,
            value: (answer.values[String(field.id)] || "").trim(),
          }))
          .filter((row) => row.value);
        if (!rows.length) return null;

        if (field.kind === "choice" || field.kind === "date") {
          const groups = new Map<string, string[]>();
          for (const row of rows) {
            const key = field.kind === "choice"
              ? (field.choices.find((choice) => choice.toLowerCase() === row.value.toLowerCase()) ?? row.value)
              : row.value;
            const flats = groups.get(key) ?? [];
            flats.push(row.flat);
            groups.set(key, flats);
          }
          const ordered = field.kind === "choice" && field.choices.length
            ? [
                ...field.choices.filter((choice) => groups.has(choice)),
                ...[...groups.keys()].filter((key) => !field.choices.includes(key)),
              ]
            : [...groups.keys()].sort((a, b) => (groups.get(b)?.length ?? 0) - (groups.get(a)?.length ?? 0) || a.localeCompare(b));

          return (
            <Panel key={field.id}>
              <Text style={ui.cardTitle}>{field.label}</Text>
              <Text style={ui.meta}>{rows.length} answered</Text>
              {ordered.map((item) => {
                const flats = (groups.get(item) ?? []).slice().sort(byFlat);
                const share = rows.length ? Math.round((flats.length / rows.length) * 100) : 0;
                return (
                  <View key={item} style={{ gap: 6 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                      <Text style={[ui.body, { color: colors.ink, flex: 1, fontWeight: "600" }]}>{item}</Text>
                      <Text style={ui.meta}>{flats.length} · {share}%</Text>
                    </View>
                    <View style={{ height: 8, borderRadius: 999, backgroundColor: colors.line, overflow: "hidden" }}>
                      <View style={{ width: `${share}%`, height: "100%", backgroundColor: colors.gold }} />
                    </View>
                    {flats.length <= 8 ? (
                      <Text style={ui.meta}>{flats.join(" · ")}</Text>
                    ) : null}
                  </View>
                );
              })}
            </Panel>
          );
        }

        return (
          <Panel key={field.id}>
            <Text style={ui.cardTitle}>{field.label}</Text>
            <Text style={ui.meta}>{rows.length} wrote an answer</Text>
            {rows.sort((a, b) => byFlat(a.flat, b.flat)).map((row) => (
              <View key={row.flat} style={{ gap: 2 }}>
                <Text style={ui.label}>{row.flat}{flat && row.flat === flat ? " · Your home" : ""}</Text>
                <HtmlBody html={row.value} style={{ color: colors.ink }} />
              </View>
            ))}
          </Panel>
        );
      })}
    </View>
  );
}

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
      const nextValues: Record<number, string> = { ...values };
      for (const field of form.fields) {
        if (field.kind === "date") nextValues[field.id] = normalizeDate(values[field.id] || "");
        if (field.required && !nextValues[field.id]?.trim()) {
          throw new Error(`Fill in ${field.label}.`);
        }
        if (field.kind === "date" && nextValues[field.id] && !/^\d{4}-\d{2}-\d{2}$/.test(nextValues[field.id])) {
          throw new Error(`Choose a valid date for ${field.label}.`);
        }
      }
      setValues(nextValues);
      const note = await submitForm(
        form.id,
        phone,
        form.fields
          .map((field) => ({ fieldId: field.id, value: nextValues[field.id]?.trim() || "" }))
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
    <Screen title={form?.title || "Enquiry"} onRefresh={load} busy={!ready && !message}>
      {form?.note ? <HtmlBody html={form.note} /> : null}
      {message ? <Banner text={message} tone={tone} /> : null}
      {form?.closed ? <Text style={ui.body}>This form is closed.</Text> : null}
      {form?.submitted && !form.closed ? (
        <Text style={[ui.meta, { marginBottom: 4 }]}>
          Your replies are filled in. Change any line and save.
        </Text>
      ) : null}
      {!canSend && form ? <Banner text="You can look at this. You cannot change it." /> : null}
      {!flat && form ? <Banner text="Link a home to this account before sending." /> : null}
      {form?.homes != null ? <Text style={ui.meta}>{form.homes} homes have replied.</Text> : null}
      {form?.results === "admins" && !form.community.length && form.homes == null ? (
        <Banner text="Only admins can see every home’s replies on this enquiry." />
      ) : null}
      {form ? (
        <>
          {flat && phone.trim() ? (
            <Text style={[ui.meta, { marginBottom: 8 }]}>
              {form.submitted ? "Updating reply for" : "Replying as"}{" "}
              <Text style={{ color: colors.ink, fontFamily: fonts.display, fontWeight: "600" }}>
                {[flat, phone].filter(Boolean).join(" · ")}
              </Text>
            </Text>
          ) : (
            <View style={{ gap: 6, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.line }}>
              <Text style={ui.meta}>Phone for this home</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="10-digit phone number"
                placeholderTextColor={colors.placeholder}
                keyboardType="phone-pad"
                editable={!locked}
                style={{
                  minHeight: 44,
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: "rgba(15, 23, 42, 0.18)",
                  fontFamily: fonts.body,
                  fontSize: 16,
                  color: colors.ink,
                }}
              />
            </View>
          )}
          <View>
            {form.fields.map((field, index) => (
              <View
                key={field.id}
                style={{
                  gap: 10,
                  paddingVertical: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.line,
                }}
              >
                <Text style={[ui.meta, { fontVariant: ["tabular-nums"] }]}>
                  {index + 1}
                  <Text style={{ color: "#94a3b8" }}> / {form.fields.length}</Text>
                </Text>
                <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 16, fontWeight: "600", lineHeight: 22 }}>
                  {field.label}
                  {field.required ? <Text style={{ color: "#94a3b8", fontWeight: "500" }}> required</Text> : null}
                </Text>
                <FieldAnswer
                  field={field}
                  value={values[field.id] || ""}
                  locked={locked}
                  onChange={(next) => setValues({ ...values, [field.id]: next })}
                />
              </View>
            ))}
          </View>
          {!locked ? (
            <Pressable onPress={send} disabled={saving} style={ui.button}>
              <Text style={ui.buttonText}>{saving ? "Saving…" : form.submitted ? "Save reply" : "Send reply"}</Text>
            </Pressable>
          ) : null}
          {form.results === "community" || form.results === "link" || form.community.length > 0 ? (
            <FormResults fields={form.fields} community={form.community} flat={flat} />
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
