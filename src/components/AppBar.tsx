import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton, Mark } from "@/components/Screen";
import { loadAccount, loadNotifications } from "@/lib/community";
import { type Account } from "@/lib/place";
import { useSession } from "@/lib/session";
import { colors, fonts } from "@/theme";

function detailLine(account: Account | null) {
  if (!account) return "";
  const parts = [account.name || account.roleLabel];
  if (account.flatNumber) parts.push(account.flatNumber);
  if (account.wing) parts.push(`Wing ${account.wing}`);
  return parts.filter(Boolean).join(" · ");
}

export function ResidentBar() {
  const router = useRouter();
  const { session } = useSession();
  const [account, setAccount] = useState<Account | null>(null);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    if (!session) return;
    const [next, notes] = await Promise.all([
      loadAccount().catch(() => null),
      loadNotifications().catch(() => []),
    ]);
    if (next) setAccount(next);
    setUnread(notes.filter((item) => !item.read).length);
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const insets = useSafeAreaInsets();
  const detail = detailLine(account);

  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
        paddingHorizontal: 16,
        paddingTop: insets.top + 8,
        paddingBottom: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52 }}>
        <Mark size={36} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text numberOfLines={1} style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 18, fontWeight: "600" }}>
            RV Uddiipta
          </Text>
          {detail ? (
            <Text numberOfLines={1} style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13 }}>
              {detail}
            </Text>
          ) : null}
        </View>
        <IconButton icon="bell" label="Notifications" badge={unread} onPress={() => router.push("/(resident)/notifications")} />
        <IconButton icon="user" label="Profile" onPress={() => router.navigate("/(resident)/profile")} />
      </View>
    </View>
  );
}
