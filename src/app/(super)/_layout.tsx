import { useCallback, useState } from "react";
import { Pressable, Text } from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { Note, PageBusy, Screen } from "@/components/Screen";
import { loadAccount } from "@/lib/community";
import { pathForPlace } from "@/lib/place";
import { colors, ui } from "@/theme";

export default function SuperAdminLayout() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [fallback, setFallback] = useState("/(resident)");
  const [message, setMessage] = useState("");

  useFocusEffect(useCallback(() => {
    let live = true;
    loadAccount()
      .then((account) => {
        if (!live) return;
        const home = pathForPlace(account.place);
        setFallback(home);
        if (!account.superAdmin) {
          setAllowed(false);
          router.replace(home as never);
          return;
        }
        setAllowed(true);
        setMessage("");
      })
      .catch((error: unknown) => {
        if (!live) return;
        setAllowed(false);
        setMessage(error instanceof Error ? error.message : "Could not open super admin.");
      });
    return () => { live = false; };
  }, [router]));

  if (allowed === null) return <PageBusy />;

  if (!allowed) {
    return (
      <Screen>
        <Text style={ui.title}>Not available</Text>
        <Note text={message || "This area is for the super admin only."} />
        <Pressable onPress={() => router.replace(fallback as never)} style={ui.button}>
          <Text style={ui.buttonText}>Open my workspace</Text>
        </Pressable>
      </Screen>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.page } }} />
  );
}
