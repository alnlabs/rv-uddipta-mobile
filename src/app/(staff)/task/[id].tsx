import { useCallback, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Back, Loading, Note, Screen } from "@/components/Screen";
import { loadTasks, updateTask } from "@/lib/community";
import { taskStatus, type Task } from "@/lib/tasks";
import { colors, ui } from "@/theme";

export default function TaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const tasks = (await loadTasks()) as Task[];
      setTask(tasks.find((item) => item.id === Number(id)) ?? null);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load this task.");
    } finally {
      setReady(true);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function save(status: "in_progress" | "done") {
    if (saving || !task) return;
    setSaving(true);
    setMessage("");
    try {
      await updateTask(task.id, status, note);
      setNote("");
      await load();
      setMessage(status === "done" ? "Task completed." : "Progress saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "That was not saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen onRefresh={load}>
      <Back />
      {!ready ? <Loading /> : null}
      {task ? (
        <>
          <Text style={ui.label}>{taskStatus(task.status)}</Text>
          <Text style={ui.title}>{task.title}</Text>
          <Text style={ui.body}>{task.place || "Location is with the office"}</Text>
          {task.body ? <Text style={ui.body}>{task.body}</Text> : null}
          {task.status !== "done" ? (
            <View style={ui.card}>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Add a note"
                placeholderTextColor={colors.placeholder}
                style={[ui.field, { minHeight: 96, textAlignVertical: "top" }]}
                multiline
              />
              <Text style={ui.body}>Photos are not stored yet. Write what you found in the note.</Text>
              {task.status === "open" ? (
                <Pressable disabled={saving} onPress={() => save("in_progress")} style={ui.button}>
                  <Text style={ui.buttonText}>{saving ? "Saving…" : "Start task"}</Text>
                </Pressable>
              ) : (
                <Pressable disabled={saving} onPress={() => save("in_progress")} style={ui.button}>
                  <Text style={ui.buttonText}>{saving ? "Saving…" : "Save progress"}</Text>
                </Pressable>
              )}
              <Pressable disabled={saving} onPress={() => save("done")} style={ui.button}>
                <Text style={ui.buttonText}>{saving ? "Saving…" : "Mark complete"}</Text>
              </Pressable>
            </View>
          ) : null}
        </>
      ) : null}
      {ready && !task && !message ? <Text style={ui.body}>This task is not on your list.</Text> : null}
      {message ? <Note text={message} tone={message.endsWith("saved.") || message.endsWith("completed.") ? "ok" : "error"} /> : null}
    </Screen>
  );
}
