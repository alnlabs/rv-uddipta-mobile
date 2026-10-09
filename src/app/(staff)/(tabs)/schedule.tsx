import { useCallback, useState } from "react";
import { Pressable, Text } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Loading, Note, Screen } from "@/components/Screen";
import { loadTasks } from "@/lib/community";
import { isToday, taskStatus, type Task } from "@/lib/tasks";
import { ui } from "@/theme";

export default function ScheduleScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      setTasks((await loadTasks()) as Task[]);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load the schedule.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const open = tasks.filter((task) => task.status !== "done");
  const today = open.filter((task) => isToday(task.created_at));
  const later = open.filter((task) => !isToday(task.created_at));

  return (
    <Screen onRefresh={load}>
      <Text style={ui.eyebrow}>Work</Text>
      <Text style={ui.title}>Schedule</Text>
      <Text style={ui.body}>Shifts are not stored on the phone yet. These are the assignments already given to you.</Text>
      {message ? <Note text={message} /> : null}
      {!ready ? <Loading /> : null}
      {today.length > 0 ? <Text style={ui.label}>Today</Text> : null}
      {today.map((task) => (
        <Pressable key={task.id} onPress={() => router.push(`/(staff)/task/${task.id}`)} style={ui.card}>
          <Text style={ui.cardTitle}>{task.title}</Text>
          <Text style={ui.body}>{taskStatus(task.status)} · {task.place}</Text>
        </Pressable>
      ))}
      {later.length > 0 ? <Text style={ui.label}>Still open</Text> : null}
      {later.map((task) => (
        <Pressable key={task.id} onPress={() => router.push(`/(staff)/task/${task.id}`)} style={ui.card}>
          <Text style={ui.cardTitle}>{task.title}</Text>
          <Text style={ui.body}>{taskStatus(task.status)} · {task.place}</Text>
        </Pressable>
      ))}
      {ready && open.length === 0 ? <Text style={ui.body}>Nothing is scheduled.</Text> : null}
    </Screen>
  );
}
