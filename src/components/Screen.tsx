import { useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Animated, Image, ImageBackground, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter, useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, type IconName } from "@/components/Icon";
import { supabase } from "@/lib/supabase";
import { colors, fonts, ui } from "@/theme";

export type AppBarSearch = {
  open: boolean
  value: string
  placeholder?: string
  onOpen: () => void
  onClose: () => void
  onChange: (value: string) => void
  onSubmit: () => void
};

const logo = require("../../assets/icon-full.png");
const apartment = require("../../assets/hero-uddiipta.jpg");

export const brandBrown = "#854225";

export function Mark({ size = 44 }: { size?: number }) {
  return (
    <Image
      source={logo}
      accessibilityLabel="RV Uddiipta"
      style={{ width: size, height: size, borderRadius: size * 0.18 }}
    />
  );
}

export function BrandScreen({
  children,
  busy = false,
  status,
}: {
  children?: ReactNode
  /** Show spinner + status after a short wait so fast launches stay clean. */
  busy?: boolean
  status?: string
  mark?: number
}) {
  const [showBusy, setShowBusy] = useState(false);

  useEffect(() => {
    if (!busy) {
      setShowBusy(false);
      return;
    }
    const timer = setTimeout(() => setShowBusy(true), 450);
    return () => clearTimeout(timer);
  }, [busy]);

  const footer = children || showBusy;

  return (
    <View style={{ flex: 1, backgroundColor: brandBrown, alignItems: "center", justifyContent: "center" }}>
      <Image
        source={logo}
        accessibilityLabel="RV Uddiipta"
        resizeMode="contain"
        style={{ width: "72%", maxWidth: 320, aspectRatio: 1 }}
      />
      {footer ? (
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 48, alignItems: "center", gap: 12, paddingHorizontal: 28 }}>
          {showBusy ? (
            <>
              <ActivityIndicator color="#f8fafc" size="small" />
              <Text style={{ color: "#f8fafc", textAlign: "center", fontSize: 15, lineHeight: 20, opacity: 0.92 }}>
                {status || "Loading…"}
              </Text>
            </>
          ) : null}
          {children}
        </View>
      ) : null}
    </View>
  );
}

export function ApartmentBackdrop({ children }: { children: ReactNode }) {
  return (
    <ImageBackground source={apartment} style={{ flex: 1 }} resizeMode="cover">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(15, 23, 42, 0.5)" }]} />
      {children}
    </ImageBackground>
  );
}

/** Spinner over static UI — use after launch so the screen is already visible. */
export function LoadingOverlay({ light = false }: { light?: boolean } = {}) {
  return (
    <View
      pointerEvents="auto"
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: light ? "rgba(248,250,252,0.55)" : "rgba(248,250,252,0.72)",
          alignItems: "center",
          justifyContent: "center",
        },
      ]}
    >
      <ActivityIndicator color={colors.button} />
    </View>
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
  showBack = true,
  search,
  padBottom = 0,
  busy = false,
}: {
  children: ReactNode
  refreshing?: boolean
  onRefresh?: () => Promise<void>
  hero?: boolean
  underHeader?: boolean
  title?: string
  action?: ReactNode
  showBack?: boolean
  search?: AppBarSearch
  /** Extra scroll padding (e.g. clear a FAB). */
  padBottom?: number
  /** Keep chrome + static content visible; spinner sits on top. */
  busy?: boolean
}) {
  const insets = useSafeAreaInsets();
  const paddingTop = title || underHeader ? 16 : hero ? 0 : insets.top + 16;
  return (
    <View style={ui.page}>
    {title ? <NavBar title={title} action={action} showBack={showBack} search={search} /> : null}
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          ui.content,
          {
            paddingTop,
            paddingBottom: insets.bottom + 28 + padBottom,
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
      {busy ? <LoadingOverlay /> : null}
    </View>
    </View>
  );
}

function useGoBack() {
  const router = useRouter();
  const segments = useSegments();
  return () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    const root = segments[0];
    if (root === "(security)") router.replace("/(security)/gate");
    else if (root === "(staff)") router.replace("/(staff)");
    else if (root === "(super)") router.replace("/(super)");
    else router.replace("/(resident)");
  };
}

export function NavBar({
  title,
  action,
  showBack = true,
  search,
}: {
  title: string
  action?: ReactNode
  showBack?: boolean
  search?: AppBarSearch
}) {
  const insets = useSafeAreaInsets();
  const goBack = useGoBack();
  const searching = Boolean(search?.open);

  return (
    <View style={{ backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line, paddingTop: insets.top }}>
      <View style={{ minHeight: 52, flexDirection: "row", alignItems: "center", paddingLeft: showBack && !searching ? 0 : 16, paddingRight: 12, gap: 4 }}>
        {showBack && !searching ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={goBack}
            hitSlop={6}
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
          >
            <Icon name="back" color={colors.ink} size={22} />
          </Pressable>
        ) : null}
        {searching && search ? (
          <TextInput
            value={search.value}
            onChangeText={search.onChange}
            onSubmitEditing={search.onSubmit}
            placeholder={search.placeholder || "Search"}
            placeholderTextColor={colors.placeholder}
            autoFocus
            returnKeyType="search"
            style={{
              flex: 1,
              minHeight: 40,
              paddingHorizontal: 12,
              borderRadius: 12,
              backgroundColor: "rgba(15, 23, 42, 0.05)",
              color: colors.ink,
              fontFamily: fonts.body,
              fontSize: 16,
            }}
          />
        ) : (
          <Text numberOfLines={1} style={{ flex: 1, color: colors.ink, fontFamily: fonts.display, fontSize: 18, fontWeight: "600" }}>
            {title}
          </Text>
        )}
        {search ? (
          <IconButton
            icon={searching ? "close" : "search"}
            label={searching ? "Close search" : "Search"}
            onPress={() => {
              if (searching) search.onClose();
              else search.onOpen();
            }}
          />
        ) : null}
        {!searching ? action : null}
      </View>
    </View>
  );
}

export function Back() {
  const goBack = useGoBack();
  return (
    <Pressable onPress={goBack} hitSlop={8} style={{ minHeight: 44, justifyContent: "center" }}>
      <Text style={ui.quietText}>Back</Text>
    </Pressable>
  );
}

export function BrandRow() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Mark size={48} />
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
      <Text
        numberOfLines={2}
        style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 13, fontWeight: "600", textAlign: "center" }}
      >
        {label}
      </Text>
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

function SkeletonBlock({
  height,
  width = "100%",
  radius = 10,
  style,
}: {
  height: number
  width?: number | `${number}%`
  radius?: number
  style?: object
}) {
  return (
    <View
      style={[
        {
          height,
          width,
          borderRadius: radius,
          backgroundColor: "rgba(15, 23, 42, 0.08)",
        },
        style,
      ]}
    />
  );
}

/** Full-page shell with spinner on top (for route gates). Prefer Screen busy= for normal screens. */
export function PageBusy() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 72, gap: 14 }}>
        <View style={{ height: 28, width: "42%", borderRadius: 8, backgroundColor: "rgba(15,23,42,0.08)" }} />
        <View style={[ui.card, { height: 88 }]} />
        <View style={[ui.card, { height: 88 }]} />
        <View style={[ui.card, { height: 120 }]} />
      </View>
      <LoadingOverlay />
    </View>
  );
}

/** Soft card placeholders for the first paint of a screen. */
export function Loading({ cards = 3 }: { cards?: number } = {}) {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <Animated.View style={{ gap: 12, opacity: pulse }}>
      {Array.from({ length: cards }, (_, index) => (
        <View key={index} style={[ui.card, { gap: 12, padding: 16 }]}>
          <SkeletonBlock height={12} width="34%" />
          <SkeletonBlock height={18} width="72%" />
          <SkeletonBlock height={14} width="88%" />
          <SkeletonBlock height={14} width="56%" />
        </View>
      ))}
    </Animated.View>
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
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Text style={ui.cardTitle} numberOfLines={1}>{title}</Text>
        {detail ? <Text style={ui.body} numberOfLines={2}>{detail}</Text> : null}
      </View>
    </Pressable>
  );
}
