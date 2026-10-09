import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Loading, Masthead, Note, Screen } from "@/components/Screen";
import { loadTasks } from "@/lib/community";
import { isToday, taskStatus, type Task } from "@/lib/tasks";
import { colors, ui } from "@/theme";

export default function StaffHomeScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      setTasks((await loadTasks()) as Task[]);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load your tasks.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const open = tasks.filter((task) => task.status !== "done");
  const next = open[0];
  const today = open.filter((task) => isToday(task.created_at));

  return (
    <Screen hero onRefresh={load}>
      <Masthead title="Today" detail={ready ? (open.length ? `${open.length} open` : "Nothing is assigned.") : undefined} />
      {message ? <Note text={message} /> : null}
      {!ready ? <Loading /> : null}
      {next ? (
        <Pressable onPress={() => router.push(`/(staff)/task/${next.id}`)} style={[ui.card, { flexDirection: "row", alignItems: "center", gap: 12, borderLeftWidth: 3, borderLeftColor: colors.gold }]}>
          <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
            <Icon name="form" color={colors.button} size={20} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={ui.label}>{taskStatus(next.status)}</Text>
            <Text style={ui.cardTitle}>{next.title}</Text>
            <Text style={ui.body}>{next.place || "Location is with the office"}</Text>
          </View>
        </Pressable>
      ) : null}
      {today.filter((task) => task.id !== next?.id).map((task) => (
        <Pressable key={task.id} onPress={() => router.push(`/(staff)/task/${task.id}`)} style={ui.card}>
          <Text style={ui.label}>{taskStatus(task.status)}</Text>
          <Text style={ui.cardTitle}>{task.title}</Text>
        </Pressable>
      ))}
    </Screen>
  );
}
