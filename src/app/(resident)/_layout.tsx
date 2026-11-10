import { useCallback, useState } from "react";
import { Pressable, Text } from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { Note, PageBusy, Screen } from "@/components/Screen";
import { Workspace } from "@/components/Workspace";
import { loadAccount } from "@/lib/community";
import { colors, ui } from "@/theme";

export default function ResidentLayout() {
  const router = useRouter();
  const [blocked, setBlocked] = useState<boolean | null>(null);

  useFocusEffect(useCallback(() => {
    let live = true;
    loadAccount()
      .then((account) => {
        if (!live) return;
        if (account.superAdmin) {
          setBlocked(true);
          router.replace("/(super)");
          return;
        }
        setBlocked(false);
      })
      .catch(() => {
        if (live) setBlocked(false);
      });
    return () => { live = false; };
  }, [router]));

  if (blocked === null) return <PageBusy />;

  if (blocked) {
    return (
      <Screen>
        <Text style={ui.title}>Super admin</Text>
        <Note text="Resident screens are closed for this account." />
        <Pressable onPress={() => router.replace("/(super)")} style={ui.button}>
          <Text style={ui.buttonText}>Open super admin</Text>
        </Pressable>
      </Screen>
    );
  }

  return (
    <Workspace place="home">
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.page } }} />
    </Workspace>
  );
}
