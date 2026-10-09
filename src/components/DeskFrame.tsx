import { useCallback, useState, type ReactNode } from "react";
import { Text } from "react-native";
import { useFocusEffect } from "expo-router";
import { RoleSwitch } from "@/components/RoleSwitch";
import { BrandRow, Screen, SignOut } from "@/components/Screen";
import { loadAccount } from "@/lib/community";
import { type Account } from "@/lib/place";
import { useSession } from "@/lib/session";
import { ui } from "@/theme";

export function DeskFrame({
  title,
  lede,
  refreshing,
  onRefresh,
  children,
}: {
  title: string
  lede?: string
  refreshing?: boolean
  onRefresh?: () => Promise<void>
  children: ReactNode
}) {
  const { session } = useSession();
  const [account, setAccount] = useState<Account | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    const next = await loadAccount().catch(() => null);
    setAccount(next);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={
        onRefresh
          ? async () => {
              await onRefresh();
              await load();
            }
          : undefined
      }
    >
      <BrandRow />
      <RoleSwitch roles={account?.roles ?? []} active={account?.role ?? ""} enabled={Boolean(account?.canSwitch)} />
      <Text style={ui.title}>{title}</Text>
      {lede ? <Text style={ui.body}>{lede}</Text> : null}
      {children}
      <SignOut />
    </Screen>
  );
}
