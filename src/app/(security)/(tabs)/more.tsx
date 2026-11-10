import { useCallback, useState } from "react";
import { Text } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SectionLabel } from "@/components/Blocks";
import { HtmlBody } from "@/components/HtmlText";
import { MenuRow, Note, Screen, SignOut } from "@/components/Screen";
import { loadAccount, loadHelp } from "@/lib/community";
import { type Account } from "@/lib/place";
import { ui } from "@/theme";

export default function SecurityMoreScreen() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [contacts, setContacts] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const [person, help] = await Promise.all([loadAccount(), loadHelp()]);
      setAccount(person);
      setContacts(help.contacts);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load this page.");
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const showManage = account?.role === "admin";
  const showHome = account?.role === "admin"
    || Boolean(account?.roles.some((item) => item.role === "owner" || item.role === "co_owner" || item.role === "tenant"));

  return (
    <Screen onRefresh={load} busy={!account && !message}>
      <Text style={ui.eyebrow}>Account</Text>
      <Text style={ui.title}>More</Text>
      {account ? (
        <>
          <Text style={ui.cardTitle}>{account.name || "Security"}</Text>
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
              detail="Approvals, team roles, notices"
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

      <SectionLabel title="Gate tools" />
      <MenuRow icon="gate" title="Scan QR pass" detail="Visitor or delivery QR" onPress={() => router.push("/(security)/scan")} />
      <MenuRow icon="people" title="Guest without pass" detail="Notify the home" onPress={() => router.push("/(security)/walk-in?purpose=Guest")} />
      <MenuRow icon="mail" title="Delivery without pass" detail="Notify the home" onPress={() => router.push("/(security)/walk-in?purpose=Delivery")} />
      <MenuRow icon="people" title="Call a home" detail="Dial without seeing the number" onPress={() => router.push("/(security)/directory")} />

      <SectionLabel title="Emergency contacts" />
      {contacts ? <HtmlBody html={contacts} /> : <Text style={ui.body}>The office has not published emergency contacts yet.</Text>}
      {message ? <Note text={message} /> : null}
      <SignOut />
    </Screen>
  );
}
