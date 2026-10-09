import { type ReactNode } from "react";
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, type IconName } from "@/components/Icon";
import { supabase } from "@/lib/supabase";
import { colors, fonts, ui } from "@/theme";

const logo = require("../../assets/icon.png");

export function Mark({ size = 36 }: { size?: number }) {
  return <Image source={logo} style={{ width: size, height: size, borderRadius: size * 0.22 }} />;
}

export function Screen({
  children,
  refreshing,
  onRefresh,
  hero = false,
}: {
  children: ReactNode
  refreshing?: boolean
  onRefresh?: () => Promise<void>
  hero?: boolean
}) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={ui.page}
      contentContainerStyle={[
        ui.content,
        {
          paddingTop: hero ? 0 : insets.top + 16,
          paddingBottom: insets.bottom + 28,
        },
      ]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={Boolean(refreshing)}
            onRefresh={() => {
              onRefresh().catch(() => undefined);
            }}
            tintColor={colors.button}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

export function Back() {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.back()} hitSlop={8} style={{ minHeight: 44, justifyContent: "center" }}>
      <Text style={ui.quietText}>Back</Text>
    </Pressable>
  );
}

export function BrandRow() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Mark />
      <Text style={ui.eyebrow}>RV Uddiipta</Text>
    </View>
  );
}

export function Masthead({
  title,
  detail,
  children,
}: {
  title: string
  detail?: string
  children?: ReactNode
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        marginHorizontal: -20,
        backgroundColor: colors.page,
        paddingHorizontal: 20,
        paddingTop: insets.top + 14,
        paddingBottom: 8,
        gap: 8,
      }}
    >
      <BrandRow />
      <Text style={ui.title}>{title}</Text>
      {detail ? <Text style={ui.body}>{detail}</Text> : null}
      {children}
    </View>
  );
}

export function Tile({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 92,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingHorizontal: 8,
        paddingVertical: 12,
        borderRadius: 18,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: "rgba(15, 23, 42, 0.1)",
      }}
    >
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} color={colors.button} size={20} />
      </View>
      <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 13, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

export function SignOut() {
  return (
    <Pressable onPress={() => supabase.auth.signOut()} style={ui.quiet}>
      <Text style={ui.quietText}>Sign out</Text>
    </Pressable>
  );
}

export function Loading() {
  return (
    <View style={{ paddingVertical: 48, alignItems: "center" }}>
      <ActivityIndicator color={colors.button} />
    </View>
  );
}

export function Note({ text, tone = "error" }: { text: string; tone?: "error" | "ok" }) {
  return <Text style={tone === "ok" ? ui.body : ui.error}>{text}</Text>;
}

export function MenuRow({
  title,
  detail,
  onPress,
  icon,
}: {
  title: string
  detail?: string
  onPress: () => void
  icon?: IconName
}) {
  return (
    <Pressable onPress={onPress} style={[ui.card, { flexDirection: "row", alignItems: "center", gap: 12 }]}>
      {icon ? (
        <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} color={colors.button} size={20} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={ui.cardTitle}>{title}</Text>
        {detail ? <Text style={ui.body}>{detail}</Text> : null}
      </View>
    </Pressable>
  );
}
