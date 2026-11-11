import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { RolesAssign } from "@/components/RolesAssign";
import { Note, PageBusy, Screen } from "@/components/Screen";
import { loadAccount } from "@/lib/community";
import { ui } from "@/theme";
import { Pressable, Text } from "react-native";

export default function SocietyRolesScreen() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useFocusEffect(useCallback(() => {
    let live = true;
    loadAccount()
      .then((account) => {
        if (!live) return;
        if (account.superAdmin) {
          router.replace("/(super)/roles");
          return;
        }
        setAllowed(account.role === "admin");
      })
      .catch(() => {
        if (live) setAllowed(false);
      });
    return () => { live = false; };
  }, [router]));

  if (allowed === null) return <PageBusy />;

  if (!allowed) {
    return (
      <Screen title="People">
        <Note text="Team people are for society admin. Switch to Admin first if you hold that role." />
        <Pressable onPress={() => router.replace("/(resident)/(tabs)/admin")} style={ui.button}>
          <Text style={ui.buttonText}>Back to Admin</Text>
        </Pressable>
      </Screen>
    );
  }

  return (
    <RolesAssign
      title="People"
      badge="Team"
      intro="People on the team and which society role they hold."
    />
  );
}
