import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Banner, Empty, Panel, SectionLabel } from "@/components/Blocks";
import { Screen } from "@/components/Screen";
import {
  loadStaffAttendance,
  markStaffAttendance,
  type AttendancePerson,
} from "@/lib/office";
import { colors, ui } from "@/theme";

function statusLabel(status: AttendancePerson["status"]) {
  if (status === "present") return "Present";
  if (status === "absent") return "Absent";
  return "Not marked";
}

export function StaffAttendanceScreen({
  title = "Attendance",
}: {
  title?: string
}) {
  const [people, setPeople] = useState<AttendancePerson[]>([]);
  const [dutyOn, setDutyOn] = useState("");
  const [canMark, setCanMark] = useState(false);
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
    setBusyId(person.id);
    setMessage("");
    try {
      const result = await markStaffAttendance({ personId: person.id, status });
      setTone("ok");
      setMessage(result.message || `${person.name} marked ${status}.`);
      await load();
    } catch (error) {
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Could not save attendance.");
    } finally {
      setBusyId(null);
    }
  }

  const present = people.filter((person) => person.status === "present").length;
  const absent = people.filter((person) => person.status === "absent").length;
  const pending = people.filter((person) => !person.status).length;

  return (
    <Screen title={title} onRefresh={load} busy={!ready && !message}>
      <Text style={ui.body}>
        {canMark
          ? "Mark service staff and facility present or absent for today. Security accounts are not on this roster — they mark it."
          : "Today’s staff and facility attendance. Security marks this at the gate and is not listed here."}
      </Text>
      {dutyOn ? <Text style={ui.meta}>{dutyOn}</Text> : null}
      {message ? <Banner text={message} tone={tone} /> : null}

      {ready ? (
        <Text style={ui.meta}>
          Present {present} · Absent {absent} · Not marked {pending}
        </Text>
      ) : null}

      <SectionLabel title="Staff & facility" />
      {ready && people.length === 0 ? (
        <Empty title="No staff listed" detail="Create Staff or Facility people under People first. Security is not shown here." />
      ) : null}

      {people.map((person) => (
        <Panel key={person.id}>
          <View style={{ gap: 4 }}>
            <Text style={ui.cardTitle}>{person.name}</Text>
            <Text style={ui.meta}>{person.roleLabel} · {statusLabel(person.status)}</Text>
          </View>
          {canMark ? (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
              <Pressable
                disabled={Boolean(busyId)}
                onPress={() => { mark(person, "present").catch(() => undefined); }}
                style={[
                  ui.button,
                  { flex: 1 },
                  person.status === "present" ? null : { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.button },
                ]}
              >
                <Text style={[ui.buttonText, person.status === "present" ? null : { color: colors.button }]}>
                  {busyId === person.id && person.status !== "present" ? "…" : "Present"}
                </Text>
              </Pressable>
              <Pressable
                disabled={Boolean(busyId)}
                onPress={() => { mark(person, "absent").catch(() => undefined); }}
                style={[
                  ui.button,
                  { flex: 1 },
                  person.status === "absent"
                    ? { backgroundColor: colors.danger }
                    : { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.button },
                ]}
              >
                <Text style={[ui.buttonText, person.status === "absent" ? null : { color: colors.button }]}>
                  {busyId === person.id && person.status !== "absent" ? "…" : "Absent"}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </Panel>
      ))}
    </Screen>
  );
}
