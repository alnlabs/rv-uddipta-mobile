import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { Note, PageBusy, Screen } from "@/components/Screen";
import { loadAccount } from "@/lib/community";
import { canAccessPlace, pathForPlace } from "@/lib/place";
import { ui } from "@/theme";

export function Workspace({ place, children }: { place: string; children: ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [home, setHome] = useState("/(resident)");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const account = await loadAccount();
      if (account.superAdmin) {
        setHome("/(super)");
        setAllowed(false);
        setMessage("Super admin uses the super admin screens.");
        return;
      }
      setHome(pathForPlace(account.place));
      setAllowed(canAccessPlace(account, place));
      setMessage("");
    } catch (error) {
      setAllowed(false);
      setMessage(error instanceof Error ? error.message : "Could not check this workspace.");
    }
  }, [place]);

  useEffect(() => { load(); }, [load]);

  if (allowed === null) return <PageBusy />;

  if (!allowed) {
    return (
      <Screen>
        <Text style={ui.title}>Not available</Text>
        <Note text={message || "This workspace is not on your account."} />
        <Pressable onPress={() => router.replace(home as never)} style={ui.button}>
          <Text style={ui.buttonText}>Open my workspace</Text>
        </Pressable>
      </Screen>
    );
  }

  return children;
}
