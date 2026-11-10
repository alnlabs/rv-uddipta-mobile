import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SectionLabel } from "@/components/Blocks";
import { HtmlBody } from "@/components/HtmlText";
import { MenuRow, Note, Screen, SignOut } from "@/components/Screen";
import { loadAccount, loadNotices, loadTasks } from "@/lib/community";
import { type Account } from "@/lib/place";
import { taskStatus, type Task } from "@/lib/tasks";
import { ui } from "@/theme";

export default function StaffMoreScreen() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [done, setDone] = useState<Task[]>([]);
  const [notices, setNotices] = useState<Awaited<ReturnType<typeof loadNotices>>>([]);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const [person, tasks, notes] = await Promise.all([
        loadAccount(),
        loadTasks().catch(() => []),
        loadNotices().catch(() => []),
      ]);
      setAccount(person);
      setDone((tasks as Task[]).filter((task) => task.status === "done").slice(0, 8));
      setNotices(notes.slice(0, 3));
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load this page.");
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const showManage = account?.role === "facility" || account?.role === "admin";
  const showHome = account?.role === "admin"
    || Boolean(account?.roles.some((item) => item.role === "owner" || item.role === "co_owner" || item.role === "tenant"));

  return (
    <Screen onRefresh={load} busy={!account && !message}>
      <Text style={ui.eyebrow}>Account</Text>
      <Text style={ui.title}>More</Text>
      {account ? (
        <>
          <Text style={ui.cardTitle}>{account.name || "Staff"}</Text>
          <Text style={ui.body}>{account.roleLabel}</Text>
        </>
      ) : null}

      {showManage || showHome ? (
        <>
          <SectionLabel title="Office" />
          {showManage ? (
            <MenuRow
              icon="admin"
              title="Admin"
              detail="Bookings, jobs, and office tools"
              onPress={() => router.push("/(resident)/(tabs)/admin")}
            />
          ) : null}
          {showHome ? (
            <MenuRow
              icon="home"
              title="Open home"
              detail="Resident home and community"
              onPress={() => router.push("/(resident)")}
            />
          ) : null}
        </>
      ) : null}

      {done.length > 0 ? <Text style={ui.label}>Completed</Text> : null}
      {done.map((task) => (
        <Pressable key={task.id} onPress={() => router.push(`/(staff)/task/${task.id}`)} style={ui.card}>
          <Text style={ui.label}>{taskStatus(task.status)}</Text>
          <Text style={ui.cardTitle}>{task.title}</Text>
        </Pressable>
      ))}
      {notices.length > 0 ? <Text style={ui.label}>Notices</Text> : null}
      {notices.map((notice) => (
        <ViewNotice key={notice.id} title={notice.title} body={notice.body} />
      ))}
      {message ? <Note text={message} /> : null}
      <SignOut />
    </Screen>
  );
}

function ViewNotice({ title, body }: { title: string; body: string }) {
  return (
    <View style={ui.card}>
      <Text style={ui.cardTitle}>{title}</Text>
      {body ? <HtmlBody html={body} lines={4} /> : null}
    </View>
  );
}
