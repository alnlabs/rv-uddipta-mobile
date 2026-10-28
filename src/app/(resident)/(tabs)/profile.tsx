import { useCallback, useState } from "react";
import { Linking, Pressable, Text } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { RoleSwitch } from "@/components/RoleSwitch";
import { Loading, MenuRow, Note, Screen, SignOut } from "@/components/Screen";
import { loadAccount } from "@/lib/community";
import { loadFeatures, featureOn } from "@/lib/features";
import { type Account } from "@/lib/place";
import { siteUrl } from "@/lib/site";
import { ui } from "@/theme";

export default function ProfileScreen() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [features, setFeatures] = useState<string[] | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const [person, enabled] = await Promise.all([
        loadAccount(),
        loadFeatures().catch(() => null),
      ]);
      setAccount(person);
      setFeatures(enabled);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load your profile.");
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const homeLine = account
    ? [account.roleLabel, account.flatNumber, account.wing ? `Wing ${account.wing}` : null].filter(Boolean).join(" · ")
    : "";
  const showCommittee =
    account?.role === "committee"
    || account?.role === "admin"
    || Boolean(account?.roles.some((item) => item.role === "committee" || item.role === "admin"));

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
          {account.needsClaim ? (
            <Pressable onPress={() => router.push("/(resident)/claim")} style={ui.button}>
              <Text style={ui.buttonText}>Claim my flat</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
      <Text style={ui.body}>Alerts stay in Inbox. Tap a push notification to open the right screen.</Text>
      {featureOn(features, "neighbours") ? (
        <MenuRow icon="people" title="Neighbours" detail="Find a flat or a name" onPress={() => router.push("/(resident)/neighbours")} />
      ) : null}
      {showCommittee && featureOn(features, "committee") ? (
        <MenuRow icon="admin" title="Committee" detail="Open decisions" onPress={() => router.push("/(resident)/committee")} />
      ) : null}
      <MenuRow
        icon="model"
        title="Floor plans"
        detail="Opens the existing plans on the website. They are not redrawn here."
        onPress={() => { Linking.openURL(`${siteUrl}/community?view=3d`).catch(() => undefined); }}
      />
      {message ? <Note text={message} /> : null}
      <SignOut />
    </Screen>
  );
}
