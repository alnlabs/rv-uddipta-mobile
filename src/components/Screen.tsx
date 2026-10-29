import { type ReactNode } from "react";
import { ActivityIndicator, Image, ImageBackground, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, type IconName } from "@/components/Icon";
import { supabase } from "@/lib/supabase";
import { colors, fonts, ui } from "@/theme";

const logo = require("../../assets/icon.png");
const apartment = require("../../assets/hero-uddiipta.jpg");

export function Mark({ size = 36 }: { size?: number }) {
  return <Image source={logo} style={{ width: size, height: size, borderRadius: size * 0.22 }} />;
}

export function ApartmentBackdrop({ children }: { children: ReactNode }) {
  return (
    <ImageBackground source={apartment} style={{ flex: 1 }} resizeMode="cover">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(15, 23, 42, 0.5)" }]} />
      {children}
    </ImageBackground>
  );
}

export function Screen({
  children,
  refreshing,
  onRefresh,
  hero = false,
  underHeader = false,
  title,
  action,
}: {
  children: ReactNode
  refreshing?: boolean
  onRefresh?: () => Promise<void>
  hero?: boolean
  underHeader?: boolean
  title?: string
  action?: ReactNode
}) {
  const insets = useSafeAreaInsets();
  const paddingTop = title || underHeader ? 16 : hero ? 0 : insets.top + 16;
  return (
    <View style={ui.page}>
    {title ? <NavBar title={title} action={action} /> : null}
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[
        ui.content,
        {
          paddingTop,
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
    </View>
  );
}

export function NavBar({ title, action }: { title: string; action?: ReactNode }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={{ backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line, paddingTop: insets.top }}>
      <View style={{ minHeight: 52, flexDirection: "row", alignItems: "center", paddingRight: 12, gap: 4 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          hitSlop={6}
          style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
        >
          <Icon name="back" color={colors.ink} size={22} />
        </Pressable>
        <Text numberOfLines={1} style={{ flex: 1, color: colors.ink, fontFamily: fonts.display, fontSize: 18, fontWeight: "600" }}>
          {title}
        </Text>
        {action}
      </View>
    </View>
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

export function IconButton({
  icon,
  label,
  onPress,
  badge,
}: {
  icon: IconName
  label: string
  onPress: () => void
  badge?: number
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label}, ${badge} unread` : label}
      onPress={onPress}
      hitSlop={6}
      style={{
        width: 44,
        height: 44,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: "rgba(15, 23, 42, 0.1)",
      }}
    >
      <Icon name={icon} color={colors.button} size={20} />
      {badge ? (
        <View
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            paddingHorizontal: 4,
            backgroundColor: colors.goldInk,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: colors.white, fontFamily: fonts.display, fontSize: 10, fontWeight: "600" }}>
            {badge > 9 ? "9+" : badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function Masthead({
  title,
  detail,
  actions,
  children,
}: {
  title: string
  detail?: string
  actions?: ReactNode
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
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <BrandRow />
        {actions ? <View style={{ flexDirection: "row", gap: 8 }}>{actions}</View> : null}
      </View>
      <Text style={ui.title}>{title}</Text>
      {detail ? <Text style={ui.body}>{detail}</Text> : null}
      {children}
    </View>
  );
}

export function Tile({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
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
      <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 13, fontWeight: "600", textAlign: "center" }}>{label}</Text>
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
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={[ui.card, { flexDirection: "row", alignItems: "center", gap: 12 }]}>
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
