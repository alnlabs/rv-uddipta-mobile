import { useCallback, useState } from "react";
import { Text } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SectionLabel } from "@/components/Blocks";
import { MenuRow, Note, Screen, SignOut } from "@/components/Screen";
import { loadAccount } from "@/lib/community";
import { type Account } from "@/lib/place";
import { ui } from "@/theme";

export default function SecurityMoreScreen() {
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

  return (
    <Screen title="More" showBack={false} onRefresh={load} busy={!account && !message}>
      {account ? (
        <>
          <Text style={ui.cardTitle}>{account.name || "Security"}</Text>
          <Text style={ui.body}>{account.roleLabel}</Text>
        </>
      ) : null}
      <Text style={ui.body}>Gate tools live on the Gate tab. Emergency contacts are listed there too.</Text>

      <SectionLabel title="Work" />
      <MenuRow
        icon="form"
        title="My tasks"
        detail="Tasks opened for Security"
        onPress={() => router.push("/(security)/tasks")}
      />
      <MenuRow
        icon="people"
        title="Staff attendance"
        detail="Mark present or absent for today"
        onPress={() => router.push("/(security)/attendance")}
      />

      {message ? <Note text={message} /> : null}
      <SignOut />
    </Screen>
  );
}
