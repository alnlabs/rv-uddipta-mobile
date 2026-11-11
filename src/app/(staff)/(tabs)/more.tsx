import { useCallback, useState } from "react";
import { Text } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SectionLabel } from "@/components/Blocks";
import { MenuRow, Note, Screen, SignOut } from "@/components/Screen";
import { loadAccount } from "@/lib/community";
import { type Account } from "@/lib/place";
import { ui } from "@/theme";

export default function StaffMoreScreen() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      setAccount(await loadAccount());
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
    <Screen title="More" showBack={false} onRefresh={load} busy={!account && !message}>
      {account ? (
        <>
          <Text style={ui.cardTitle}>{account.name || "Staff"}</Text>
          <Text style={ui.body}>{account.roleLabel}</Text>
        </>
      ) : null}

      <SectionLabel title="Today" />
      <MenuRow
        icon="schedule"
        title="Attendance"
        detail="See who is present today"
        onPress={() => router.push("/(staff)/attendance")}
      />

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

      {message ? <Note text={message} /> : null}
      <SignOut />
    </Screen>
  );
}
