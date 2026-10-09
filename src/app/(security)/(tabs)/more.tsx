import { useCallback, useState } from "react";
import { Text } from "react-native";
import { useFocusEffect } from "expo-router";
import { RoleSwitch } from "@/components/RoleSwitch";
import { Loading, Note, Screen, SignOut } from "@/components/Screen";
import { loadAccount, loadHelp } from "@/lib/community";
import { type Account } from "@/lib/place";
import { ui } from "@/theme";

export default function SecurityMoreScreen() {
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

  return (
    <Screen>
      <Text style={ui.eyebrow}>Account</Text>
      <Text style={ui.title}>More</Text>
      {!account && !message ? <Loading /> : null}
      {account ? (
        <>
          <Text style={ui.cardTitle}>{account.name || "Security"}</Text>
          <Text style={ui.body}>{account.roleLabel}</Text>
          <RoleSwitch roles={account.roles} active={account.role} enabled={account.canSwitch} />
        </>
      ) : null}
      <Text style={ui.label}>Emergency contacts</Text>
      <Text style={ui.body}>{contacts || "The office has not published emergency contacts yet."}</Text>
      <Text style={ui.body}>Vehicle entry and shift records are kept with the office. They are not on this phone yet.</Text>
      {message ? <Note text={message} /> : null}
      <SignOut />
    </Screen>
  );
}
