import { useCallback, useState } from "react";
import { Pressable, Text } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Loading, Note, Screen } from "@/components/Screen";
import { loadTasks } from "@/lib/community";
import { taskStatus, type Task } from "@/lib/tasks";
import { ui } from "@/theme";

export default function TasksScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      setTasks((await loadTasks()) as Task[]);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load tasks.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const open = tasks.filter((task) => task.status !== "done");

  return (
    <Screen onRefresh={load}>
      <Text style={ui.eyebrow}>Work</Text>
      <Text style={ui.title}>My tasks</Text>
      {message ? <Note text={message} /> : null}
      {!ready ? <Loading /> : null}
      {ready && open.length === 0 ? <Text style={ui.body}>No open tasks.</Text> : null}
      {open.map((task) => (
        <Pressable key={task.id} onPress={() => router.push(`/(staff)/task/${task.id}`)} style={ui.card}>
          <Text style={ui.label}>{taskStatus(task.status)}</Text>
          <Text style={ui.cardTitle}>{task.title}</Text>
          <Text style={ui.body}>{task.place || "Location is with the office"}</Text>
        </Pressable>
      ))}
    </Screen>
  );
}
