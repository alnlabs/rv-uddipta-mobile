import { useMemo, useState } from "react";
import { Pressable, Switch, Text, TextInput, View } from "react-native";
import { Banner, Panel } from "@/components/Blocks";
import { Screen } from "@/components/Screen";
import { indiaDay } from "@/lib/day";
import { publishNotice } from "@/lib/office";
import { colors, ui } from "@/theme";

const KINDS = [
  { value: "announcement", label: "Announcement" },
  { value: "maintenance", label: "Maintenance" },
  { value: "meeting", label: "Meeting" },
] as const;

function dateParts(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return { year: "", month: "", day: "" };
  return { year: match[1], month: match[2], day: match[3] };
}

export default function PublishNoticeScreen() {
  const [kind, setKind] = useState<(typeof KINDS)[number]["value"]>("announcement");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [startsOn, setStartsOn] = useState(indiaDay(1));
  const [pin, setPin] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"error" | "ok">("error");
  const [saving, setSaving] = useState(false);

  const parts = dateParts(startsOn);
  const year = Number(parts.year) || new Date().getFullYear();
  const month = Number(parts.month) || 0;
  const years = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 4 }, (_, index) => String(now + index));
  }, []);
  const months = [
    ["01", "Jan"], ["02", "Feb"], ["03", "Mar"], ["04", "Apr"],
    ["05", "May"], ["06", "Jun"], ["07", "Jul"], ["08", "Aug"],
    ["09", "Sep"], ["10", "Oct"], ["11", "Nov"], ["12", "Dec"],
  ];
  const daysInMonth = month ? new Date(year, month, 0).getDate() : 31;
  const days = Array.from({ length: daysInMonth }, (_, index) => String(index + 1).padStart(2, "0"));

  function setDatePart(next: { year?: string; month?: string; day?: string }) {
    const y = next.year ?? parts.year;
    const m = next.month ?? parts.month;
    const d = next.day ?? parts.day;
    if (y && m && d) setStartsOn(`${y}-${m}-${d}`);
    else if (y && m) setStartsOn(`${y}-${m}-`);
    else if (y) setStartsOn(`${y}-`);
  }

  async function post() {
    if (saving) return;
    if (title.trim().length < 3) {
      setTone("error");
      setMessage("Write a title of at least 3 characters.");
      return;
    }
    if (kind === "meeting" && !/^\d{4}-\d{2}-\d{2}$/.test(startsOn)) {
      setTone("error");
      setMessage("Choose the meeting date.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const result = await publishNotice({
        kind,
        title,
        body,
        startsOn: kind === "meeting" ? startsOn : undefined,
        pin,
      });
      setTone("ok");
      setMessage(result.message);
      setTitle("");
      setBody("");
      setPin(false);
    } catch (error) {
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Could not publish that.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen title="Publish notice">
      <Text style={ui.body}>Post an official notice to every home. Meetings need a date.</Text>
      {message ? <Banner text={message} tone={tone} /> : null}
      <Panel>
        <Text style={ui.label}>Type</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {KINDS.map((item) => (
            <Pressable
              key={item.value}
              onPress={() => setKind(item.value)}
              style={[
                ui.button,
                {
                  paddingHorizontal: 12,
                  backgroundColor: kind === item.value ? colors.button : colors.white,
                  borderWidth: 1,
                  borderColor: colors.button,
                },
              ]}
            >
              <Text style={[ui.buttonText, { color: kind === item.value ? colors.onButton : colors.button, fontSize: 13 }]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor={colors.placeholder}
          style={[ui.field, { backgroundColor: colors.page, borderWidth: 0 }]}
        />
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Details (optional)"
          placeholderTextColor={colors.placeholder}
          style={[ui.field, { backgroundColor: colors.page, borderWidth: 0, minHeight: 110 }]}
          multiline
        />
        {kind === "meeting" ? (
          <View style={{ gap: 8 }}>
            <Text style={ui.label}>Meeting date</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {years.map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setDatePart({ year: value })}
                  style={[ui.button, { paddingHorizontal: 10, backgroundColor: parts.year === value ? colors.button : colors.white, borderWidth: 1, borderColor: colors.button }]}
                >
                  <Text style={[ui.buttonText, { color: parts.year === value ? colors.onButton : colors.button, fontSize: 12 }]}>{value}</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {months.map(([value, label]) => (
                <Pressable
                  key={value}
                  onPress={() => setDatePart({ month: value })}
                  style={[ui.button, { paddingHorizontal: 10, backgroundColor: parts.month === value ? colors.button : colors.white, borderWidth: 1, borderColor: colors.button }]}
                >
                  <Text style={[ui.buttonText, { color: parts.month === value ? colors.onButton : colors.button, fontSize: 12 }]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {days.map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setDatePart({ day: value })}
                  style={[ui.button, { paddingHorizontal: 10, backgroundColor: parts.day === value ? colors.button : colors.white, borderWidth: 1, borderColor: colors.button }]}
                >
                  <Text style={[ui.buttonText, { color: parts.day === value ? colors.onButton : colors.button, fontSize: 12 }]}>{value}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={ui.body}>Pin to the top</Text>
          <Switch value={pin} onValueChange={setPin} trackColor={{ true: colors.gold }} />
        </View>
        <Pressable disabled={saving} onPress={post} style={ui.button}>
          <Text style={ui.buttonText}>{saving ? "Publishing…" : "Publish"}</Text>
        </Pressable>
      </Panel>
    </Screen>
  );
}
