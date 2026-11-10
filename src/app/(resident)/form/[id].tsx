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
  const people = [...community].sort((a, b) => byFlat(a.flatNumber, b.flatNumber));
  if (!people.length) {
    return (
      <Panel>
        <Text style={ui.cardTitle}>No answers yet</Text>
        <Text style={ui.body}>When homes send answers, they show up here question by question.</Text>
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
    <Screen title={form?.title || "Query"} onRefresh={load} busy={!ready && !message}>
      {form?.note ? <HtmlBody html={form.note} /> : null}
      {message ? <Banner text={message} tone={tone} /> : null}
      {form?.closed ? <Text style={ui.body}>This form is closed.</Text> : null}
      {form?.submitted && !form.closed ? <Banner text="Your home already sent this. Sending again updates that answer." tone="ok" /> : null}
      {!canSend && form ? <Banner text="You can look at this. You cannot change it." /> : null}
      {!flat && form ? <Banner text="Link a home to this account before sending a form." /> : null}
      {form?.homes != null ? <Text style={ui.meta}>{form.homes} homes have answered.</Text> : null}
      {form?.results === "admins" && !form.community.length && form.homes == null ? (
        <Banner text="Only admins can see every home’s answers on this form." />
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
              <Text style={ui.buttonText}>{saving ? "Sending…" : form.submitted ? "Update answer" : "Send"}</Text>
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
