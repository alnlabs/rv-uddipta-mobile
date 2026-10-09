import { useCallback, useState } from "react";
import { Text } from "react-native";
import { useFocusEffect } from "expo-router";
import { RoleSwitch } from "@/components/RoleSwitch";
import { Back, Loading, Note, Screen, SignOut } from "@/components/Screen";
import { loadAccount } from "@/lib/community";
import { type Account } from "@/lib/place";
import { ui } from "@/theme";

export default function ProfileScreen() {
  const [account, setAccount] = useState<Account | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      setAccount(await loadAccount());
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load your profile.");
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen>
      <Back />
      <Text style={ui.eyebrow}>Account</Text>
      <Text style={ui.title}>Profile</Text>
      {!account && !message ? <Loading /> : null}
      {account ? (
        <>
          <Text style={ui.cardTitle}>{account.name || "Resident"}</Text>
          <Text style={ui.body}>{account.roleLabel}{account.flatNumber ? ` · ${account.flatNumber}` : ""}</Text>
          <RoleSwitch roles={account.roles} active={account.role} enabled={account.canSwitch} />
          {!account.canSwitch ? <Text style={ui.body}>One role is on this account.</Text> : null}
        </>
      ) : null}
      <Text style={ui.body}>Notification preferences and a separate help page are not set up yet. Alerts you already receive stay in Notifications.</Text>
      {message ? <Note text={message} /> : null}
      <SignOut />
    </Screen>
  );
}
