import { type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter, useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { colors, fonts } from "@/theme";

/** Ops console look — not the resident soft-card UI. */
export const ops = {
  page: "#eef2f6",
  header: "#0f172a",
  headerText: "#f8fafc",
  muted: "#94a3b8",
  ink: "#0f172a",
  line: "rgba(15, 23, 42, 0.1)",
  sheet: "#ffffff",
  accent: "#b45309",
  badge: "#fef3c7",
  badgeText: "#92400e",
  action: "#0f172a",
  actionText: "#f8fafc",
  danger: "#991b1b",
};

function useOpsBack() {
  const router = useRouter();
  const segments = useSegments();
  return () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    if (segments[0] === "(super)") router.replace("/(super)");
    else router.replace("/(resident)/office");
  };
}

export function AdminScreen({
  title,
  badge = "Admin",
  children,
  onRefresh,
  refreshing,
  showBack = true,
  action,
  search,
  busy = false,
}: {
  title: string
  badge?: string
  children: ReactNode
  onRefresh?: () => Promise<void>
  refreshing?: boolean
  showBack?: boolean
  action?: ReactNode
  busy?: boolean
  search?: {
    open: boolean
    value: string
    placeholder?: string
    onOpen: () => void
    onClose: () => void
    onChange: (value: string) => void
    onSubmit: () => void
  }
}) {
  const insets = useSafeAreaInsets();
  const goBack = useOpsBack();
  const searching = Boolean(search?.open);

  return (
    <View style={{ flex: 1, backgroundColor: ops.page }}>
      <View style={{ backgroundColor: ops.header, paddingTop: insets.top }}>
        <View style={{ minHeight: 56, flexDirection: "row", alignItems: "center", paddingLeft: showBack && !searching ? 4 : 16, paddingRight: 12, gap: 6 }}>
          {showBack && !searching ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={goBack}
              hitSlop={6}
              style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
            >
              <Icon name="back" color={ops.headerText} size={22} />
            </Pressable>
          ) : null}
          {searching && search ? (
            <TextInput
              value={search.value}
              onChangeText={search.onChange}
              onSubmitEditing={search.onSubmit}
              placeholder={search.placeholder || "Search"}
              placeholderTextColor={ops.muted}
              autoFocus
              returnKeyType="search"
              style={{
                flex: 1,
                minHeight: 40,
                paddingHorizontal: 12,
                borderRadius: 8,
                backgroundColor: "rgba(248,250,252,0.12)",
                color: ops.headerText,
                fontFamily: fonts.body,
                fontSize: 16,
              }}
            />
          ) : (
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: ops.muted, fontFamily: fonts.display, fontSize: 10, fontWeight: "600", letterSpacing: 1.4, textTransform: "uppercase" }}>
                {badge}
              </Text>
              <Text numberOfLines={1} style={{ color: ops.headerText, fontFamily: fonts.display, fontSize: 18, fontWeight: "600" }}>
                {title}
              </Text>
            </View>
          )}
          {search ? (
            <Pressable
              onPress={() => (searching ? search.onClose() : search.onOpen())}
              style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
            >
              <Icon name={searching ? "close" : "search"} color={ops.headerText} size={20} />
            </Pressable>
          ) : null}
          {!searching ? action : null}
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: 14, paddingBottom: insets.bottom + 24, gap: 0 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={Boolean(refreshing)}
                onRefresh={() => { onRefresh().catch(() => undefined); }}
                tintColor={ops.header}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
        {busy ? (
          <View
            pointerEvents="auto"
            style={{
              ...StyleSheet.absoluteFill,
              backgroundColor: "rgba(241,245,249,0.72)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ActivityIndicator color={ops.header} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function AdminIntro({ text }: { text: string }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}>
      <Text style={{ color: "#475569", fontFamily: fonts.body, fontSize: 14, lineHeight: 20 }}>{text}</Text>
    </View>
  );
}

export function AdminStats({
  items,
}: {
  items: { label: string; value: string | number }[]
}) {
  if (!items.length) return null;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, paddingBottom: 12 }}>
      {items.map((item) => (
        <View
          key={item.label}
          style={{
            minWidth: "30%",
            flexGrow: 1,
            backgroundColor: ops.header,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        >
          <Text style={{ color: ops.muted, fontFamily: fonts.display, fontSize: 10, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase" }}>
            {item.label}
          </Text>
          <Text style={{ color: ops.headerText, fontFamily: fonts.display, fontSize: 22, fontWeight: "600", marginTop: 2 }}>
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function AdminSheet({ children }: { children: ReactNode }) {
  return (
    <View style={{ marginHorizontal: 16, marginBottom: 12, backgroundColor: ops.sheet, borderRadius: 10, borderWidth: 1, borderColor: ops.line, overflow: "hidden" }}>
      {children}
    </View>
  );
}

export function AdminRow({
  title,
  detail,
  value,
  onPress,
  last = false,
}: {
  title: string
  detail?: string
  value?: string
  onPress?: () => void
  last?: boolean
}) {
  const body = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: ops.line,
        backgroundColor: ops.sheet,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: ops.ink, fontFamily: fonts.display, fontSize: 15, fontWeight: "600" }} numberOfLines={1}>
          {title}
        </Text>
        {detail ? (
          <Text style={{ color: "#64748b", fontFamily: fonts.body, fontSize: 13, lineHeight: 18 }} numberOfLines={2}>
            {detail}
          </Text>
        ) : null}
      </View>
      {value ? (
        <View style={{ backgroundColor: ops.badge, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
          <Text style={{ color: ops.badgeText, fontFamily: fonts.display, fontSize: 12, fontWeight: "600" }}>{value}</Text>
        </View>
      ) : null}
      {onPress ? (
        <Text style={{ color: "#94a3b8", fontFamily: fonts.display, fontSize: 22, fontWeight: "600", marginTop: -2 }}>›</Text>
      ) : null}
    </View>
  );
  if (!onPress) return body;
  return <Pressable onPress={onPress}>{body}</Pressable>;
}

export function AdminRecord({
  kicker,
  title,
  lines = [],
  last = false,
}: {
  kicker?: string
  title: string
  lines?: string[]
  last?: boolean
}) {
  return (
    <View
      style={{
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 3,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: ops.line,
      }}
    >
      {kicker ? (
        <Text style={{ color: ops.accent, fontFamily: fonts.display, fontSize: 11, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase" }}>
          {kicker}
        </Text>
      ) : null}
      <Text style={{ color: ops.ink, fontFamily: fonts.display, fontSize: 15, fontWeight: "600" }}>{title}</Text>
      {lines.filter(Boolean).map((line) => (
        <Text key={line} style={{ color: "#64748b", fontFamily: fonts.body, fontSize: 13, lineHeight: 18 }}>{line}</Text>
      ))}
    </View>
  );
}

export function AdminBanner({ text, tone = "error" }: { text: string; tone?: "error" | "ok" }) {
  const ok = tone === "ok";
  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 10,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: ok ? "rgba(5,150,105,0.12)" : "rgba(153,27,27,0.08)",
      }}
    >
      <Text style={{ color: ok ? colors.ink : ops.danger, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 }}>{text}</Text>
    </View>
  );
}

export function AdminEmpty({ title, detail }: { title: string; detail?: string }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 28, alignItems: "center", gap: 6 }}>
      <Text style={{ color: ops.ink, fontFamily: fonts.display, fontSize: 16, fontWeight: "600" }}>{title}</Text>
      {detail ? <Text style={{ color: "#64748b", fontFamily: fonts.body, fontSize: 14, textAlign: "center" }}>{detail}</Text> : null}
    </View>
  );
}

export function AdminField(props: {
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
}) {
  return (
    <TextInput
      {...props}
      placeholderTextColor="#94a3b8"
      style={{
        marginHorizontal: 16,
        marginTop: 2,
        marginBottom: 10,
        backgroundColor: ops.sheet,
        borderWidth: 1,
        borderColor: ops.line,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 11,
        fontFamily: fonts.body,
        fontSize: 15,
        color: ops.ink,
      }}
    />
  );
}

export function AdminButton({
  label,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string
  onPress: () => void
  secondary?: boolean
  disabled?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        minHeight: 44,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 14,
        opacity: disabled ? 0.55 : 1,
        backgroundColor: secondary ? ops.sheet : ops.action,
        borderWidth: secondary ? 1 : 0,
        borderColor: ops.line,
      }}
    >
      <Text style={{
        color: secondary ? ops.ink : ops.actionText,
        fontFamily: fonts.display,
        fontSize: 14,
        fontWeight: "600",
      }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
