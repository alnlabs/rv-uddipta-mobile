import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { switchAccountRole } from "@/lib/community";
import { pathForPlace, type AccountRole } from "@/lib/place";
import { useSession } from "@/lib/session";
import { colors, fonts } from "@/theme";

export function RoleSwitch({
  roles,
  active,
  enabled,
}: {
  roles: AccountRole[]
  active: string
  enabled: boolean
}) {
  const { session } = useSession();
  const router = useRouter();
  const [message, setMessage] = useState("");
  if (!enabled || roles.length < 2) return null;

  async function choose(role: string) {
    if (!session || role === active) return;
    setMessage("");
    try {
      const place = await switchAccountRole(role);
      router.replace(pathForPlace(place));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not switch.");
    }
  }

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {roles.map((item) => {
        const on = item.role === active;
        return (
          <Pressable
            key={item.role}
            onPress={() => { choose(item.role).catch(() => undefined); }}
            style={{
              borderRadius: 999,
              paddingHorizontal: 14,
              paddingVertical: 8,
              backgroundColor: on ? colors.button : colors.white,
              borderWidth: 1,
              borderColor: on ? colors.button : colors.line,
            }}
          >
            <Text style={{ color: on ? colors.onButton : colors.ink, fontFamily: fonts.display, fontWeight: "600" }}>{item.label}</Text>
          </Pressable>
        );
      })}
      {message ? <Text style={{ color: colors.goldInk }}>{message}</Text> : null}
    </View>
  );
}
