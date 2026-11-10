import { type ReactNode } from "react";
import { Text } from "react-native";
import { BrandRow, Screen, SignOut } from "@/components/Screen";
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
  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <BrandRow />
      <Text style={ui.title}>{title}</Text>
      {lede ? <Text style={ui.body}>{lede}</Text> : null}
      {children}
      <SignOut />
    </Screen>
  );
}
