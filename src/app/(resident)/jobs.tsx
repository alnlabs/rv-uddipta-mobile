import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Banner, Empty, Panel, SectionLabel } from "@/components/Blocks";
import { Screen } from "@/components/Screen";
import { assignJob, loadJobs, openJob, setOnDuty, type DeskJob } from "@/lib/office";
import { colors, ui } from "@/theme";

const JOB_STATUSES = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
] as const;

export default function JobsScreen() {
  const [people, setPeople] = useState<{ id: string; name: string; onDuty: boolean }[]>([]);
  const [jobs, setJobs] = useState<DeskJob[]>([]);
  const [showDone, setShowDone] = useState(false);
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");
  const [body, setBody] = useState("");
  const [assigneeDraft, setAssigneeDraft] = useState<Record<number, string>>({});
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"error" | "ok">("error");
  const [ready, setReady] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await loadJobs();
      setPeople(data.people);
      setJobs(data.jobs);
      setMessage("");
    } catch (error) {
      setPeople([]);
      setJobs([]);
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Could not load jobs.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const visibleJobs = useMemo(
    () => (showDone ? jobs : jobs.filter((job) => job.state !== "done")),
    [jobs, showDone],
  );

  async function run(key: string, work: () => Promise<{ message?: string }>) {
    if (busyKey) return;
    setBusyKey(key);
    setMessage("");
    try {
      const result = await work();
      setTone("ok");
      setMessage(result.message || "Saved.");
      await load();
    } catch (error) {
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Could not update that.");
    } finally {
      setBusyKey(null);
    }
  }

  function setJobStatus(job: DeskJob, status: (typeof JOB_STATUSES)[number]["value"]) {
    if (status === "done") {
      Alert.alert("Mark job done?", job.title, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark done",
          style: "destructive",
          onPress: () => run(`status-${job.id}-done`, () => assignJob({ jobId: job.id, status: "done" })),
        },
      ]);
      return;
    }
    run(`status-${job.id}-${status}`, () => assignJob({ jobId: job.id, status }));
  }

  return (
    <Screen title="Jobs" onRefresh={load} busy={!ready && !message}>
      <Text style={ui.body}>Set who is on duty, open work, and assign people.</Text>
      {message ? <Banner text={message} tone={tone} /> : null}

      <SectionLabel title="On duty" />
      {ready && people.length === 0 ? (
        <Empty title="No staff listed" detail="Staff and facility accounts appear here." />
      ) : null}
      {people.map((person) => (
        <Panel key={person.id}>
          <Text style={ui.cardTitle}>{person.name}</Text>
          <Text style={ui.meta}>{person.onDuty ? "On duty" : "Off duty"}</Text>
          <Pressable
            disabled={Boolean(busyKey)}
            onPress={() => run(`duty-${person.id}`, () => setOnDuty({ personId: person.id, onDuty: !person.onDuty }))}
            style={[ui.button, person.onDuty ? { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.button } : null]}
          >
            <Text style={[ui.buttonText, person.onDuty ? { color: colors.button } : null]}>
              {busyKey === `duty-${person.id}` ? "Saving…" : person.onDuty ? "Mark off duty" : "Mark on duty"}
            </Text>
          </Pressable>
        </Panel>
      ))}

      <SectionLabel title="Open a job" />
      <Panel>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Job title"
          placeholderTextColor={colors.placeholder}
          style={[ui.field, { backgroundColor: colors.page, borderWidth: 0 }]}
        />
        <TextInput
          value={place}
          onChangeText={setPlace}
          placeholder="Place (optional)"
          placeholderTextColor={colors.placeholder}
          style={[ui.field, { backgroundColor: colors.page, borderWidth: 0 }]}
        />
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Details (optional)"
          placeholderTextColor={colors.placeholder}
          style={[ui.field, { backgroundColor: colors.page, borderWidth: 0, minHeight: 72 }]}
          multiline
        />
        <Pressable
          disabled={Boolean(busyKey)}
          onPress={() => {
            if (title.trim().length < 2) {
              setTone("error");
              setMessage("Name the job.");
              return;
            }
            run("open", async () => {
              const result = await openJob({ title, place, body });
              setTitle("");
              setPlace("");
              setBody("");
              return result;
            });
          }}
          style={ui.button}
        >
          <Text style={ui.buttonText}>{busyKey === "open" ? "Saving…" : "Open job"}</Text>
        </Pressable>
      </Panel>

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <SectionLabel title="Open work" />
        <Pressable onPress={() => setShowDone((value) => !value)}>
          <Text style={[ui.meta, { color: colors.goldInk }]}>{showDone ? "Hide done" : "Show done"}</Text>
        </Pressable>
      </View>
      {ready && visibleJobs.length === 0 ? (
        <Empty title={showDone ? "No jobs yet" : "No open jobs"} detail="Opened work orders show up here for assignment." />
      ) : null}
      {visibleJobs.map((job) => {
        const assignee = assigneeDraft[job.id] ?? job.assigneeId ?? people[0]?.id ?? "";
        return (
          <Panel key={job.id}>
            <Text style={ui.label}>{job.status}{job.place ? ` · ${job.place}` : ""}</Text>
            <Text style={ui.cardTitle}>{job.title}</Text>
            {job.body ? <Text style={ui.body}>{job.body}</Text> : null}
            <Text style={ui.meta}>{job.who}</Text>
            {people.length ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                {people.map((person) => (
                  <Pressable
                    key={person.id}
                    onPress={() => setAssigneeDraft((current) => ({ ...current, [job.id]: person.id }))}
                    style={[
                      ui.button,
                      {
                        paddingHorizontal: 12,
                        backgroundColor: assignee === person.id ? colors.brandSoft : colors.white,
                        borderWidth: 1,
                        borderColor: colors.line,
                      },
                    ]}
                  >
                    <Text style={[ui.buttonText, { color: colors.ink, fontSize: 13 }]}>{person.name}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <Pressable
              disabled={Boolean(busyKey) || !assignee}
              onPress={() => run(`assign-${job.id}`, () => assignJob({ jobId: job.id, assignee, status: "in_progress" }))}
              style={[ui.button, { marginTop: 8 }]}
            >
              <Text style={ui.buttonText}>{busyKey === `assign-${job.id}` ? "Saving…" : "Assign"}</Text>
            </Pressable>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {JOB_STATUSES.map((item) => (
                <Pressable
                  key={item.value}
                  disabled={Boolean(busyKey)}
                  onPress={() => setJobStatus(job, item.value)}
                  style={[
                    ui.button,
                    {
                      paddingHorizontal: 12,
                      backgroundColor: job.state === item.value ? colors.button : colors.white,
                      borderWidth: 1,
                      borderColor: colors.button,
                    },
                  ]}
                >
                  <Text style={[ui.buttonText, { color: job.state === item.value ? colors.onButton : colors.button, fontSize: 13 }]}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Panel>
        );
      })}
    </Screen>
  );
}
