import { useCallback, useState } from "react";
import { Linking, Text } from "react-native";
import { useFocusEffect } from "expo-router";
import { RoleSwitch } from "@/components/RoleSwitch";
import { Loading, MenuRow, Note, Screen, SignOut } from "@/components/Screen";
import { loadAccount } from "@/lib/community";
import { type Account } from "@/lib/place";
import { ui } from "@/theme";

const site = "https://uddipta.vercel.app";

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

  const homeLine = account
    ? [account.roleLabel, account.flatNumber, account.wing ? `Wing ${account.wing}` : null].filter(Boolean).join(" · ")
    : "";

  return (
    <Screen underHeader onRefresh={load}>
      <Text style={ui.heading}>Profile</Text>
      {!account && !message ? <Loading /> : null}
      {account ? (
        <>
          <Text style={ui.cardTitle}>{account.name || "Resident"}</Text>
          <Text style={ui.body}>{homeLine}</Text>
          {account.home ? <Note text={account.home} /> : null}
          <RoleSwitch roles={account.roles} active={account.role} enabled={account.canSwitch} />
          {!account.canSwitch ? <Text style={ui.body}>One role is on this account.</Text> : null}
        </>
      ) : null}
      <Text style={ui.body}>Notification preferences are not set up yet. Alerts you already receive open from the bell in the header.</Text>
      <MenuRow
        icon="model"
        title="Floor plans"
        detail="Opens the existing plans on the website. They are not redrawn here."
        onPress={() => { Linking.openURL(`${site}/community?view=3d`).catch(() => undefined); }}
      />
      {message ? <Note text={message} /> : null}
      <SignOut />
    </Screen>
  );
}
