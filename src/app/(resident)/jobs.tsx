import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Banner, Empty, Panel, SectionLabel } from "@/components/Blocks";
import { Screen } from "@/components/Screen";
import {
  assignJob,
  frequencyLabel,
  loadJobs,
  openJob,
  setOnDuty,
  TASK_FREQUENCIES,
  TASK_ROLES,
  updateJob,
  type DeskJob,
} from "@/lib/office";
import { colors, ui } from "@/theme";

const JOB_STATUSES = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
] as const;

type Draft = { title: string; place: string; body: string; role: string; frequency: string };

function emptyDraft(role = "staff", frequency = "daily"): Draft {
  return { title: "", place: "", body: "", role, frequency };
}

function jobDraft(job: DeskJob): Draft {
  return {
    title: job.title,
    place: job.place || "",
    body: job.body || "",
    role: job.assigneeRole || "staff",
    frequency: job.frequency || "once",
  };
}

export default function JobsScreen() {
  const [people, setPeople] = useState<{ id: string; name: string; onDuty: boolean }[]>([]);
  const [jobs, setJobs] = useState<DeskJob[]>([]);
  const [showDone, setShowDone] = useState(false);
  const [create, setCreate] = useState<Draft>(emptyDraft());
  const [edits, setEdits] = useState<Record<number, Draft>>({});
  const [openEditId, setOpenEditId] = useState<number | null>(null);
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
      setMessage(error instanceof Error ? error.message : "Could not load tasks.");
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
      Alert.alert("Mark task done?", job.title, [
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

  function ChoiceChips({
    options,
    value,
    onChange,
  }: {
    options: readonly { value: string; label: string }[]
    value: string
    onChange: (next: string) => void
  }) {
    return (
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {options.map((item) => (
          <Pressable
            key={item.value}
            onPress={() => onChange(item.value)}
            style={[
              ui.button,
              {
                paddingHorizontal: 12,
                minHeight: 40,
                backgroundColor: value === item.value ? colors.button : colors.white,
                borderWidth: 1,
                borderColor: colors.button,
              },
            ]}
          >
            <Text style={[ui.buttonText, { color: value === item.value ? colors.onButton : colors.button, fontSize: 13 }]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <Screen title="Tasks" onRefresh={load} busy={!ready && !message}>
      <Text style={ui.body}>Create a task for a role and how often it should be done. You can change it later.</Text>
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

      <SectionLabel title="New task" />
      <Panel>
        <Text style={ui.label}>For role</Text>
        <ChoiceChips options={TASK_ROLES} value={create.role} onChange={(role) => setCreate((current) => ({ ...current, role }))} />
        <Text style={ui.label}>How often</Text>
        <ChoiceChips
          options={TASK_FREQUENCIES}
          value={create.frequency}
          onChange={(frequency) => setCreate((current) => ({ ...current, frequency }))}
        />
        <TextInput
          value={create.title}
          onChangeText={(title) => setCreate((current) => ({ ...current, title }))}
          placeholder="Task title"
          placeholderTextColor={colors.placeholder}
          style={[ui.field, { backgroundColor: colors.page, borderWidth: 0 }]}
        />
        <TextInput
          value={create.place}
          onChangeText={(place) => setCreate((current) => ({ ...current, place }))}
          placeholder="Place (optional)"
          placeholderTextColor={colors.placeholder}
          style={[ui.field, { backgroundColor: colors.page, borderWidth: 0 }]}
        />
        <TextInput
          value={create.body}
          onChangeText={(body) => setCreate((current) => ({ ...current, body }))}
          placeholder="Details (optional)"
          placeholderTextColor={colors.placeholder}
          style={[ui.field, { backgroundColor: colors.page, borderWidth: 0, minHeight: 72 }]}
          multiline
        />
        <Pressable
          disabled={Boolean(busyKey)}
          onPress={() => {
            if (create.title.trim().length < 2) {
              setTone("error");
              setMessage("Name the task.");
              return;
            }
            run("open", async () => {
              const result = await openJob({
                title: create.title,
                place: create.place,
                body: create.body,
                role: create.role,
                frequency: create.frequency,
              });
              setCreate(emptyDraft(create.role, create.frequency));
              return result;
            });
          }}
          style={ui.button}
        >
          <Text style={ui.buttonText}>{busyKey === "open" ? "Saving…" : "Create task"}</Text>
        </Pressable>
      </Panel>

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <SectionLabel title="Open work" />
        <Pressable onPress={() => setShowDone((value) => !value)}>
          <Text style={[ui.meta, { color: colors.goldInk }]}>{showDone ? "Hide done" : "Show done"}</Text>
        </Pressable>
      </View>
      {ready && visibleJobs.length === 0 ? (
        <Empty title={showDone ? "No tasks yet" : "No open tasks"} detail="Tasks for a role show up here." />
      ) : null}
      {visibleJobs.map((job) => {
        const assignee = assigneeDraft[job.id] ?? job.assigneeId ?? people[0]?.id ?? "";
        const draft = edits[job.id] || jobDraft(job);
        const editing = openEditId === job.id;
        return (
          <Panel key={job.id}>
            <Text style={ui.label}>
              {job.status}
              {job.place ? ` · ${job.place}` : ""}
              {` · ${job.frequencyLabel || frequencyLabel(job.frequency)}`}
            </Text>
            <Text style={ui.cardTitle}>{job.title}</Text>
            {job.body ? <Text style={ui.body}>{job.body}</Text> : null}
            <Text style={ui.meta}>{job.who}</Text>

            <Pressable
              onPress={() => {
                if (editing) {
                  setOpenEditId(null);
                  return;
                }
                setEdits((current) => ({ ...current, [job.id]: jobDraft(job) }));
                setOpenEditId(job.id);
              }}
              style={[ui.button, { marginTop: 8, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.button }]}
            >
              <Text style={[ui.buttonText, { color: colors.button }]}>
                {editing ? "Close edit" : "Change task"}
              </Text>
            </Pressable>

            {editing ? (
              <View style={{ gap: 8, marginTop: 10 }}>
                <Text style={ui.label}>For role</Text>
                <ChoiceChips
                  options={TASK_ROLES}
                  value={draft.role}
                  onChange={(role) => setEdits((current) => ({
                    ...current,
                    [job.id]: { ...(current[job.id] || jobDraft(job)), role },
                  }))}
                />
                <Text style={ui.label}>How often</Text>
                <ChoiceChips
                  options={TASK_FREQUENCIES}
                  value={draft.frequency}
                  onChange={(frequency) => setEdits((current) => ({
                    ...current,
                    [job.id]: { ...(current[job.id] || jobDraft(job)), frequency },
                  }))}
                />
                <TextInput
                  value={draft.title}
                  onChangeText={(title) => setEdits((current) => ({
                    ...current,
                    [job.id]: { ...(current[job.id] || jobDraft(job)), title },
                  }))}
                  placeholder="Task title"
                  placeholderTextColor={colors.placeholder}
                  style={[ui.field, { backgroundColor: colors.page, borderWidth: 0 }]}
                />
                <TextInput
                  value={draft.place}
                  onChangeText={(place) => setEdits((current) => ({
                    ...current,
                    [job.id]: { ...(current[job.id] || jobDraft(job)), place },
                  }))}
                  placeholder="Place"
                  placeholderTextColor={colors.placeholder}
                  style={[ui.field, { backgroundColor: colors.page, borderWidth: 0 }]}
                />
                <TextInput
                  value={draft.body}
                  onChangeText={(body) => setEdits((current) => ({
                    ...current,
                    [job.id]: { ...(current[job.id] || jobDraft(job)), body },
                  }))}
                  placeholder="Details"
                  placeholderTextColor={colors.placeholder}
                  style={[ui.field, { backgroundColor: colors.page, borderWidth: 0, minHeight: 72 }]}
                  multiline
                />
                <Pressable
                  disabled={Boolean(busyKey)}
                  onPress={() => run(`edit-${job.id}`, async () => {
                    const result = await updateJob({
                      jobId: job.id,
                      title: draft.title,
                      place: draft.place,
                      body: draft.body,
                      role: draft.role,
                      frequency: draft.frequency,
                      clearPerson: draft.role !== job.assigneeRole,
                    });
                    setOpenEditId(null);
                    return result;
                  })}
                  style={ui.button}
                >
                  <Text style={ui.buttonText}>{busyKey === `edit-${job.id}` ? "Saving…" : "Save changes"}</Text>
                </Pressable>
              </View>
            ) : null}

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
              <Text style={ui.buttonText}>{busyKey === `assign-${job.id}` ? "Saving…" : "Assign person"}</Text>
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
