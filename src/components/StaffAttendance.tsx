import { useCallback, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Avatar, Banner, Chips, Empty } from "@/components/Blocks";
import { Screen } from "@/components/Screen";
import { planDayLabel, relativeTime } from "@/lib/day";
import {
  loadStaffAttendance,
  markStaffAttendance,
  type AttendancePerson,
} from "@/lib/office";
import { colors, fonts, ui } from "@/theme";

type Filter = "all" | "pending" | "present" | "absent";

function statusTone(status: AttendancePerson["status"]) {
  if (status === "present") {
    return { label: "Present", background: colors.brandSoft, color: colors.gold };
  }
  if (status === "absent") {
    return { label: "Absent", background: "rgba(138, 47, 47, 0.1)", color: colors.danger };
  }
  return { label: "Pending", background: "rgba(15, 23, 42, 0.06)", color: colors.muted };
}

function StatChip({
  label,
  value,
  active,
  onPress,
}: {
  label: string
  value: number
  active?: boolean
  onPress?: () => void
}) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={{
        flex: 1,
        minWidth: 0,
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 10,
        backgroundColor: active ? colors.button : colors.white,
        borderWidth: 1,
        borderColor: active ? colors.button : "rgba(15, 23, 42, 0.1)",
        gap: 2,
      }}
    >
      <Text style={{
        color: active ? colors.onButton : colors.ink,
        fontFamily: fonts.display,
        fontSize: 22,
        fontWeight: "600",
      }}
      >
        {value}
      </Text>
      <Text style={{
        color: active ? "rgba(248,250,252,0.82)" : colors.muted,
        fontFamily: fonts.body,
        fontSize: 12,
        lineHeight: 16,
      }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function MarkButton({
  label,
  active,
  tone,
  disabled,
  onPress,
}: {
  label: string
  active: boolean
  tone: "present" | "absent"
  disabled: boolean
  onPress: () => void
}) {
  let filled = { backgroundColor: colors.white, borderColor: "rgba(15, 23, 42, 0.14)", color: colors.ink };
  if (active && tone === "present") {
    filled = { backgroundColor: colors.gold, borderColor: colors.gold, color: colors.white };
  } else if (active) {
    filled = { backgroundColor: colors.danger, borderColor: colors.danger, color: colors.white };
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 42,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: filled.backgroundColor,
        borderWidth: 1,
        borderColor: filled.borderColor,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <Text style={{ color: filled.color, fontFamily: fonts.display, fontSize: 14, fontWeight: "600" }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function StaffAttendanceScreen({
  title = "Attendance",
}: {
  title?: string
}) {
  const [people, setPeople] = useState<AttendancePerson[]>([]);
  const [dutyOn, setDutyOn] = useState("");
  const [canMark, setCanMark] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"error" | "ok">("error");
  const [ready, setReady] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await loadStaffAttendance();
      setPeople(data.people);
      setDutyOn(data.dutyOn);
      setCanMark(data.canMark);
      setMessage("");
    } catch (error) {
      setPeople([]);
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Could not load attendance.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function mark(person: AttendancePerson, status: "present" | "absent") {
    if (!canMark || busyId) return;
    if (person.status === status) return;
    const previous = people;
    setBusyId(person.id);
    setMessage("");
    setPeople((current) => current.map((row) => (
      row.id === person.id
        ? { ...row, status, markedAt: new Date().toISOString() }
        : row
    )));
    try {
      const result = await markStaffAttendance({ personId: person.id, status });
      setTone("ok");
      setMessage(result.message || `${person.name} marked ${status === "present" ? "Present" : "Absent"}.`);
      await load();
    } catch (error) {
      setPeople(previous);
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Could not save attendance.");
    } finally {
      setBusyId(null);
    }
  }

  const present = people.filter((person) => person.status === "present").length;
  const absent = people.filter((person) => person.status === "absent").length;
  const pending = people.filter((person) => !person.status).length;
  const dayLabel = planDayLabel(dutyOn) || dutyOn || "Today";

  const visible = useMemo(() => {
    const filtered = people.filter((person) => {
      if (filter === "present") return person.status === "present";
      if (filter === "absent") return person.status === "absent";
      if (filter === "pending") return !person.status;
      return true;
    });
    return [...filtered].sort((a, b) => {
      const rank = (status: AttendancePerson["status"]) => {
        if (!status) return 0;
        if (status === "absent") return 1;
        return 2;
      };
      const byStatus = rank(a.status) - rank(b.status);
      if (byStatus !== 0) return byStatus;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
  }, [people, filter]);

  const filters = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "present", label: "Present" },
    { value: "absent", label: "Absent" },
  ] as const;

  return (
    <Screen title={title} onRefresh={load} busy={!ready && !message}>
      <View style={{ gap: 6 }}>
        <Text style={[ui.body, { fontSize: 14, lineHeight: 20 }]}>
          {canMark
            ? "Tap Present or Absent for each person today. Security does the marking and is not in this list."
            : "Who is Present or Absent today. Security marks this at the gate."}
        </Text>
        <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 15, fontWeight: "600" }}>
          {dayLabel}
        </Text>
      </View>

      {message ? <Banner text={message} tone={tone} /> : null}

      {ready ? (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <StatChip
            label="Present"
            value={present}
            active={filter === "present"}
            onPress={() => setFilter(filter === "present" ? "all" : "present")}
          />
          <StatChip
            label="Absent"
            value={absent}
            active={filter === "absent"}
            onPress={() => setFilter(filter === "absent" ? "all" : "absent")}
          />
          <StatChip
            label="Pending"
            value={pending}
            active={filter === "pending"}
            onPress={() => setFilter(filter === "pending" ? "all" : "pending")}
          />
        </View>
      ) : null}

      <Chips
        compact
        scroll
        options={[...filters]}
        value={filter}
        onChange={(value) => setFilter(value as Filter)}
      />

      {ready && people.length === 0 ? (
        <Empty
          title="No one to mark yet"
          detail="Add Staff or Facility people first. Security will not appear in this list."
        />
      ) : null}

      {ready && people.length > 0 && visible.length === 0 ? (
        <Empty title="No one here" detail="Pick another filter above." />
      ) : null}

      <View style={{ gap: 10 }}>
        {visible.map((person) => {
          const status = statusTone(person.status);
          const marked = person.markedAt ? relativeTime(person.markedAt) : "";
          const busy = busyId === person.id;
          return (
            <View
              key={person.id}
              style={[
                ui.surface,
                {
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  gap: 12,
                  overflow: "hidden",
                },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Avatar name={person.name} size={42} />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text numberOfLines={1} style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 16, fontWeight: "600" }}>
                    {person.name}
                  </Text>
                  <Text style={ui.meta} numberOfLines={1}>
                    {person.roleLabel}
                    {marked ? ` · ${marked}` : ""}
                  </Text>
                </View>
                <View style={{
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  backgroundColor: status.background,
                }}
                >
                  <Text style={{ color: status.color, fontFamily: fonts.display, fontSize: 12, fontWeight: "600" }}>
                    {busy ? "Saving…" : status.label}
                  </Text>
                </View>
              </View>

              {canMark ? (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <MarkButton
                    label="Present"
                    tone="present"
                    active={person.status === "present"}
                    disabled={Boolean(busyId)}
                    onPress={() => { mark(person, "present").catch(() => undefined); }}
                  />
                  <MarkButton
                    label="Absent"
                    tone="absent"
                    active={person.status === "absent"}
                    disabled={Boolean(busyId)}
                    onPress={() => { mark(person, "absent").catch(() => undefined); }}
                  />
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </Screen>
  );
}
