import { useCallback, useState } from "react";
import { Text } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SectionLabel } from "@/components/Blocks";
import { MenuRow, Note, Screen, SignOut } from "@/components/Screen";
import { loadAccount, switchAccountRole } from "@/lib/community";
import { type Account } from "@/lib/place";
import { ui } from "@/theme";

function homeRole(account: Account) {
  if (account.role === "owner" || account.role === "co_owner" || account.role === "tenant") {
    return account.role;
  }
  return account.roles.find((item) =>
    item.role === "owner" || item.role === "co_owner" || item.role === "tenant",
  )?.role || null;
}

export default function SecurityMoreScreen() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setAccount(await loadAccount());
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load this page.");
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const heldHome = account ? homeRole(account) : null;

  async function openHome() {
    if (!account || !heldHome || busy) return;
    setBusy(true);
    try {
      if (account.role !== heldHome) await switchAccountRole(heldHome);
      router.replace("/(resident)");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not open home.");
      setBusy(false);
    }
  }

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

      {heldHome ? (
        <>
          <SectionLabel title="Home" />
          <MenuRow
            icon="home"
            title="Switch to home"
            detail="Opens the resident shell for your flat"
            onPress={openHome}
          />
        </>
      ) : null}

      {message ? <Note text={message} /> : null}
      <SignOut />
    </Screen>
  );
}
