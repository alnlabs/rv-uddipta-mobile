import { useMemo, useState } from "react";
import { Dimensions, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Banner, TextButton } from "@/components/Blocks";
import { Screen } from "@/components/Screen";
import { absoluteDay, dayOffset, indiaDay, planDayLabel } from "@/lib/day";
import { publishNotice } from "@/lib/office";
import { colors, fonts, ui } from "@/theme";

const KINDS = [
  {
    value: "announcement",
    label: "Announcement",
    tip: "General news for every home.",
    example: "Water tank cleaning this Saturday",
  },
  {
    value: "maintenance",
    label: "Maintenance",
    tip: "Building work, water, lift, or repairs.",
    example: "Lift service — Block A, 10am–2pm",
  },
  {
    value: "meeting",
    label: "Meeting",
    tip: "Society meeting with a clear day.",
    example: "AGM in the clubhouse",
  },
] as const;

type Kind = (typeof KINDS)[number]["value"];

type PickerOption = {
  value: string
  label: string
  tip?: string
};

function meetingDayLabel(day: string) {
  const offset = dayOffset(day);
  const weekday = absoluteDay(day).split(",")[0] || "";
  if (offset === 0) return `Today · ${weekday}`;
  if (offset === 1) return `Tomorrow · ${weekday}`;
  return planDayLabel(day) || absoluteDay(day) || day;
}

function OptionPicker({
  label,
  title,
  value,
  options,
  onChange,
}: {
  label: string
  title: string
  value: string
  options: PickerOption[]
  onChange: (value: string) => void
}) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const chosen = options.find((item) => item.value === value);
  const sheetHeight = Math.min(
    Math.round(Dimensions.get("window").height * 0.7),
    72 + options.length * 68 + Math.max(insets.bottom, 16),
  );

  return (
    <View style={{ gap: 6 }}>
      <Text style={ui.label}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          minHeight: 48,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: "rgba(15, 23, 42, 0.14)",
          backgroundColor: colors.page,
          paddingHorizontal: 14,
          paddingVertical: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
          <Text style={{ color: colors.ink, fontFamily: fonts.body, fontSize: 15 }} numberOfLines={1}>
            {chosen?.label || "Choose"}
          </Text>
          {chosen?.tip ? (
            <Text style={ui.meta} numberOfLines={1}>{chosen.tip}</Text>
          ) : null}
        </View>
        <Text style={{ color: colors.muted, fontFamily: fonts.display, fontSize: 13, fontWeight: "600" }}>
          Change
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(15, 23, 42, 0.45)", justifyContent: "flex-end" }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => setOpen(false)}
            style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
          />
          <View
            style={{
              maxHeight: sheetHeight,
              backgroundColor: colors.white,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              paddingTop: 14,
              paddingBottom: Math.max(insets.bottom, 16),
            }}
          >
            <View style={{
              paddingHorizontal: 16,
              paddingBottom: 10,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
            >
              <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 16, fontWeight: "600", flex: 1 }}>
                {title}
              </Text>
              <Pressable
                onPress={() => setOpen(false)}
                hitSlop={8}
                style={{
                  minWidth: 64,
                  minHeight: 36,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: "rgba(15, 23, 42, 0.14)",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 12,
                  backgroundColor: colors.page,
                }}
              >
                <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 13, fontWeight: "600" }}>
                  Close
                </Text>
              </Pressable>
            </View>
            <ScrollView
              style={{ paddingHorizontal: 16 }}
              contentContainerStyle={{ gap: 6, paddingBottom: 8 }}
              keyboardShouldPersistTaps="handled"
            >
              {options.map((item) => {
                const active = item.value === value;
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                    style={{
                      minHeight: 52,
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      justifyContent: "center",
                      backgroundColor: active ? colors.brandSoft : colors.page,
                      borderWidth: 1,
                      borderColor: active ? colors.gold : "rgba(15, 23, 42, 0.1)",
                      gap: 3,
                    }}
                  >
                    <Text style={{
                      color: active ? colors.gold : colors.ink,
                      fontFamily: fonts.display,
                      fontSize: 15,
                      fontWeight: "600",
                    }}
                    >
                      {item.label}
                    </Text>
                    {item.tip ? (
                      <Text style={{ color: active ? "#047857" : colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 16 }}>
                        {item.tip}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function PublishNoticeScreen() {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("announcement");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [startsOn, setStartsOn] = useState(indiaDay(1));
  const [pin, setPin] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"error" | "ok">("error");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const meetingDays = useMemo(() => Array.from({ length: 21 }, (_, index) => indiaDay(index)), []);
  const selected = KINDS.find((item) => item.value === kind) || KINDS[0];
  const titleOk = title.trim().length >= 3;
  const canPublish = titleOk && (kind !== "meeting" || /^\d{4}-\d{2}-\d{2}$/.test(startsOn));

  const kindOptions = useMemo(
    () => KINDS.map((item) => ({ value: item.value, label: item.label, tip: item.tip })),
    [],
  );
  const dayOptions = useMemo(
    () => meetingDays.map((day) => ({
      value: day,
      label: meetingDayLabel(day),
      tip: absoluteDay(day),
    })),
    [meetingDays],
  );

  async function post() {
    if (saving || !canPublish) return;
    setSaving(true);
    setMessage("");
    setDone(false);
    try {
      const result = await publishNotice({
        kind,
        title,
        body,
        startsOn: kind === "meeting" ? startsOn : undefined,
        pin,
      });
      setTone("ok");
      setMessage(result.message || "Notice published to every home.");
      setDone(true);
      setTitle("");
      setBody("");
      setPin(false);
      setKind("announcement");
      setStartsOn(indiaDay(1));
    } catch (error) {
      setTone("error");
      setDone(false);
      setMessage(error instanceof Error ? error.message : "Could not publish that.");
    } finally {
      setSaving(false);
    }
  }

  const previewTitle = title.trim() || selected.example;
  const previewBody = body.trim();
  const previewLabel = pin ? "Pinned" : selected.label;
  const previewMeta = kind === "meeting"
    ? meetingDayLabel(startsOn)
    : "Today";

  return (
    <Screen
      title="Publish notice"
      action={(
        <TextButton label="All notices" onPress={() => router.push("/(resident)/notices")} />
      )}
    >
      <Text style={[ui.body, { fontSize: 14, lineHeight: 20 }]}>
        Official notice for every home. Residents see it in Notices and the feed.
      </Text>

      {message ? <Banner text={message} tone={tone} /> : null}

      {done ? (
        <View style={[ui.surface, { padding: 16, gap: 12 }]}>
          <Text style={ui.cardTitle}>Published</Text>
          <Text style={ui.body}>Homes will see this notice now.</Text>
          <Pressable onPress={() => router.push("/(resident)/notices")} style={ui.button}>
            <Text style={ui.buttonText}>Open notices</Text>
          </Pressable>
          <Pressable onPress={() => { setDone(false); setMessage(""); }} style={ui.quiet}>
            <Text style={ui.quietText}>Write another</Text>
          </Pressable>
        </View>
      ) : (
        <View style={[ui.surface, { padding: 14, gap: 14 }]}>
          <OptionPicker
            label="Type"
            title="Pick notice type"
            value={kind}
            options={kindOptions}
            onChange={(value) => setKind(value as Kind)}
          />

          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
              <Text style={ui.label}>Title</Text>
              <Text style={ui.meta}>{title.trim().length}/80</Text>
            </View>
            <TextInput
              value={title}
              onChangeText={(value) => setTitle(value.slice(0, 80))}
              placeholder={selected.example}
              placeholderTextColor={colors.placeholder}
              style={ui.field}
            />
            {!titleOk && title.length > 0 ? (
              <Text style={[ui.meta, { color: colors.danger }]}>Need at least 3 letters.</Text>
            ) : null}
          </View>

          <View style={{ gap: 6 }}>
            <Text style={ui.label}>Details</Text>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Optional — place, time, or what residents should do"
              placeholderTextColor={colors.placeholder}
              style={[ui.field, { minHeight: 110, textAlignVertical: "top" }]}
              multiline
            />
          </View>

          {kind === "meeting" ? (
            <OptionPicker
              label="Meeting day"
              title="Pick meeting day"
              value={startsOn}
              options={dayOptions}
              onChange={setStartsOn}
            />
          ) : null}

          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: pin }}
            onPress={() => setPin((value) => !value)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: pin ? colors.gold : "rgba(15, 23, 42, 0.12)",
              backgroundColor: pin ? colors.brandSoft : colors.page,
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
          >
            <View style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              borderWidth: 1.5,
              borderColor: pin ? colors.gold : "rgba(15, 23, 42, 0.28)",
              backgroundColor: pin ? colors.gold : colors.white,
              alignItems: "center",
              justifyContent: "center",
            }}
            >
              {pin ? (
                <Text style={{ color: colors.white, fontFamily: fonts.display, fontSize: 13, fontWeight: "700", lineHeight: 14 }}>
                  ✓
                </Text>
              ) : null}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 15, fontWeight: "600" }}>
                Pin at the top
              </Text>
              <Text style={ui.meta}>
                Stays above other notices until you unpin it.
              </Text>
            </View>
          </Pressable>

          <View style={{
            borderRadius: 14,
            borderWidth: 1,
            borderColor: "rgba(15, 23, 42, 0.08)",
            borderLeftWidth: 3,
            borderLeftColor: pin ? colors.goldInk : colors.gold,
            backgroundColor: colors.page,
            padding: 12,
            gap: 4,
          }}
          >
            <Text style={ui.label}>Preview</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
              <Text style={[ui.meta, { color: colors.goldInk, fontFamily: fonts.display, fontWeight: "600" }]}>
                {previewLabel}
              </Text>
              <Text style={ui.meta}>{previewMeta}</Text>
            </View>
            <Text style={[ui.cardTitle, { fontSize: 16 }]}>{previewTitle}</Text>
            {previewBody ? (
              <Text style={[ui.body, { fontSize: 14 }]} numberOfLines={3}>{previewBody}</Text>
            ) : (
              <Text style={[ui.meta, { fontStyle: "italic" }]}>No details yet</Text>
            )}
          </View>

          <Pressable
            disabled={saving || !canPublish}
            onPress={() => { post().catch(() => undefined); }}
            style={[ui.button, (saving || !canPublish) ? { opacity: 0.5 } : null]}
          >
            <Text style={ui.buttonText}>{saving ? "Publishing…" : "Publish to every home"}</Text>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}
