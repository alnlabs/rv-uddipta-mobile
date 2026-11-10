import { useCallback, useState } from "react";
import { Text } from "react-native";
import { useFocusEffect } from "expo-router";
import {
  AdminEmpty,
  AdminIntro,
  AdminRecord,
  AdminScreen,
  AdminSheet,
} from "@/components/AdminUi";
import { Note } from "@/components/Screen";
import { loadJobs, type DeskJob } from "@/lib/office";
import { fonts } from "@/theme";

export default function SuperJobsScreen() {
  const [jobs, setJobs] = useState<DeskJob[]>([]);
  const [people, setPeople] = useState<{ id: string; name: string; onDuty: boolean }[]>([]);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await loadJobs();
      setJobs(data.jobs.filter((job) => job.state !== "done"));
      setPeople(data.people);
      setMessage("");
    } catch (error) {
      setJobs([]);
      setPeople([]);
      setMessage(error instanceof Error ? error.message : "Could not load jobs.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onDuty = people.filter((person) => person.onDuty).map((person) => person.name).join(", ") || "nobody";

  return (
    <AdminScreen title="Jobs" badge="Overview" onRefresh={load} busy={!ready && !message}>
      <AdminIntro text="Open maintenance work. Assigning is handled by facility." />
      {people.length ? (
        <Text style={{ marginHorizontal: 16, marginBottom: 10, color: "#64748b", fontFamily: fonts.body, fontSize: 13 }}>
          On duty · {onDuty}
        </Text>
      ) : null}
      {ready && jobs.length === 0 ? (
        <AdminEmpty title="No open jobs" detail="Open work orders will show here." />
      ) : null}
      {jobs.length ? (
        <AdminSheet>
          {jobs.map((job, index) => (
            <AdminRecord
              key={job.id}
              kicker={`${job.state}${job.place ? ` · ${job.place}` : ""}`}
              title={job.title}
              lines={[job.body, job.who ? `Assigned · ${job.who}` : ""].filter(Boolean)}
              last={index === jobs.length - 1}
            />
          ))}
        </AdminSheet>
      ) : null}
      {message ? <Note text={message} /> : null}
    </AdminScreen>
  );
}
