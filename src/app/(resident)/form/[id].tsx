import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Banner, Chips, Panel, SectionLabel } from "@/components/Blocks";
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

function dateParts(value: string) {
  const iso = normalizeDate(value);
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return { year: "", month: "", day: "" };
  return { year: match[1], month: match[2], day: match[3] };
}

function DateAnswer({
  value,
  editable,
  onChange,
}: {
  value: string
  editable: boolean
  onChange: (next: string) => void
}) {
  const parts = dateParts(value);
  const year = Number(parts.year) || new Date().getFullYear();
  const month = Number(parts.month) || 0;
  const day = Number(parts.day) || 0;
  const years = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 12 }, (_, index) => String(now - 2 + index));
  }, []);
  const months = [
    ["01", "Jan"], ["02", "Feb"], ["03", "Mar"], ["04", "Apr"],
    ["05", "May"], ["06", "Jun"], ["07", "Jul"], ["08", "Aug"],
    ["09", "Sep"], ["10", "Oct"], ["11", "Nov"], ["12", "Dec"],
  ];
  const daysInMonth = month ? new Date(year, month, 0).getDate() : 31;
  const days = Array.from({ length: daysInMonth }, (_, index) => String(index + 1).padStart(2, "0"));

  function setPart(next: { year?: string; month?: string; day?: string }) {
    if (!editable) return;
    const y = next.year ?? parts.year;
    const m = next.month ?? parts.month;
    const d = next.day ?? parts.day;
    if (y && m && d) onChange(`${y}-${m}-${d}`);
    else if (y && m) onChange(`${y}-${m}-`);
    else if (y) onChange(`${y}-`);
    else onChange("");
  }

  return (
    <View style={{ gap: 10 }}>
      <Text style={ui.meta}>{parts.year && parts.month && parts.day ? `${parts.day}/${parts.month}/${parts.year}` : "Pick year, month, then day"}</Text>
      <Text style={ui.label}>Year</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {years.map((item) => {
          const active = parts.year === item;
          return (
            <Pressable
              key={item}
              disabled={!editable}
              onPress={() => setPart({ year: item, day: parts.day && Number(parts.day) > new Date(Number(item), Number(parts.month || 1), 0).getDate() ? "" : parts.day })}
              style={{
                minHeight: 40,
                paddingHorizontal: 12,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: active ? colors.button : colors.white,
                borderWidth: 1,
                borderColor: active ? colors.button : "rgba(15, 23, 42, 0.12)",
              }}
            >
              <Text style={{ color: active ? colors.onButton : colors.ink, fontFamily: fonts.display, fontSize: 13, fontWeight: "600" }}>{item}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text style={ui.label}>Month</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {months.map(([value, label]) => {
          const active = parts.month === value;
          return (
            <Pressable
              key={value}
              disabled={!editable}
              onPress={() => setPart({ month: value })}
              style={{
                minHeight: 40,
                paddingHorizontal: 12,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: active ? colors.button : colors.white,
                borderWidth: 1,
                borderColor: active ? colors.button : "rgba(15, 23, 42, 0.12)",
              }}
            >
              <Text style={{ color: active ? colors.onButton : colors.ink, fontFamily: fonts.display, fontSize: 13, fontWeight: "600" }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      {parts.month ? (
        <>
          <Text style={ui.label}>Day</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {days.map((item) => {
              const active = parts.day === item;
              return (
                <Pressable
                  key={item}
                  disabled={!editable}
                  onPress={() => setPart({ day: item })}
                  style={{
                    width: 44,
                    minHeight: 40,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: active ? colors.button : colors.white,
                    borderWidth: 1,
                    borderColor: active ? colors.button : "rgba(15, 23, 42, 0.12)",
                  }}
                >
                  <Text style={{ color: active ? colors.onButton : colors.ink, fontFamily: fonts.display, fontSize: 13, fontWeight: "600" }}>{Number(item)}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
    </View>
  );
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
      <Chips
        options={field.choices.map((choice) => ({ value: choice, label: choice }))}
        value={value}
        onChange={(choice) => {
          if (!locked) onChange(choice);
        }}
      />
    );
  }
  if (field.kind === "date") {
    return <DateAnswer value={value} editable={!locked} onChange={onChange} />;
  }
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={field.kind === "long" ? "Write your answer" : "Your answer"}
      placeholderTextColor={colors.placeholder}
      editable={!locked}
      multiline={field.kind === "long"}
      style={[ui.field, { backgroundColor: colors.page, borderWidth: 0 }, field.kind === "long" ? { minHeight: 120, textAlignVertical: "top" } : null]}
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
  const people = [...community].sort((a, b) => {
    if (flat) {
      if (a.flatNumber === flat) return -1;
      if (b.flatNumber === flat) return 1;
    }
    return byFlat(a.flatNumber, b.flatNumber);
  });

  if (!people.length) {
    return (
      <Panel>
        <Text style={ui.cardTitle}>No replies yet</Text>
        <Text style={ui.body}>When a home sends a reply, it will show here — one home at a time.</Text>
      </Panel>
    );
  }

  const summaries = fields.flatMap((field) => {
    if (field.kind !== "choice" || !field.choices.length) return [];
    const counts = new Map<string, number>();
    for (const choice of field.choices) counts.set(choice, 0);
    for (const person of people) {
      const raw = (person.values[String(field.id)] || "").trim();
      if (!raw) continue;
      const match =
        field.choices.find((choice) => choice.toLowerCase() === raw.toLowerCase()) ?? raw;
      counts.set(match, (counts.get(match) ?? 0) + 1);
    }
    const line = [...counts.entries()]
      .filter(([, count]) => count > 0)
      .map(([label, count]) => `${label} ${count}`)
      .join(" · ");
    return line ? [{ id: field.id, label: field.label, line }] : [];
  });

  return (
    <View style={{ gap: 14 }}>
      <SectionLabel title={`${people.length} ${people.length === 1 ? "home has" : "homes have"} replied`} />
      {summaries.length ? (
        <Panel>
          {summaries.map((item) => (
            <Text key={item.id} style={ui.meta}>
              {item.label}: {item.line}
            </Text>
          ))}
        </Panel>
      ) : null}
      <Panel>
        {people.map((person, index) => {
          const yours = Boolean(flat && person.flatNumber === flat);
          const rows = fields
            .map((field) => ({
              id: field.id,
              label: field.label,
              value: (person.values[String(field.id)] || "").trim(),
            }))
            .filter((row) => row.value);
          return (
            <View
              key={`${person.flatNumber}-${index}`}
              style={{
                gap: 8,
                paddingTop: index === 0 ? 0 : 14,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: colors.line,
              }}
            >
              <Text style={[ui.body, { color: colors.ink }]}>
                <Text style={{ fontFamily: fonts.display, fontWeight: "600" }}>
                  {person.flatNumber || "Home"}
                </Text>
                {yours ? " · yours" : ""}
              </Text>
              {rows.length ? (
                rows.map((row) => (
                  <View key={row.id} style={{ gap: 2 }}>
                    <Text style={ui.meta}>{row.label}</Text>
                    <HtmlBody html={row.value} style={{ color: colors.ink }} />
                  </View>
                ))
              ) : (
                <Text style={ui.meta}>Blank reply.</Text>
              )}
            </View>
          );
        })}
      </Panel>
    </View>
  );
}

const KIND_LABEL: Record<FormField["kind"], string> = {
  text: "Short answer",
  long: "Long answer",
  date: "Date",
  choice: "Pick one",
};

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
      {form?.submitted && !form.closed ? <Banner text="Your home already sent this. Sending again updates that reply." tone="ok" /> : null}
      {!canSend && form ? <Banner text="You can look at this. You cannot change it." /> : null}
      {!flat && form ? <Banner text="Link a home to this account before sending." /> : null}
      {form?.homes != null ? <Text style={ui.meta}>{form.homes} homes have replied.</Text> : null}
      {form?.results === "admins" && !form.community.length && form.homes == null ? (
        <Banner text="Only admins can see every home’s replies on this enquiry." />
      ) : null}
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
                <Text style={ui.meta}>{KIND_LABEL[field.kind]}</Text>
                <FieldAnswer
                  field={field}
                  value={values[field.id] || ""}
                  locked={locked}
                  onChange={(next) => setValues({ ...values, [field.id]: next })}
                />
              </View>
            ))}
          </Panel>
          {!locked ? (
            <Pressable onPress={send} disabled={saving} style={ui.button}>
              <Text style={ui.buttonText}>{saving ? "Sending…" : form.submitted ? "Update reply" : "Send"}</Text>
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
