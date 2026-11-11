import { type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Icon, type IconName } from "@/components/Icon";
import { colors, fonts, ui } from "@/theme";

export function Avatar({ name, size = 42 }: { name: string; size?: number }) {
  const letter = name.trim().charAt(0).toUpperCase() || "R";
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.brandSoft,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: colors.gold, fontFamily: fonts.display, fontSize: size * 0.38, fontWeight: "600" }}>{letter}</Text>
    </View>
  );
}

export function PageTitle({
  kicker,
  detail,
}: {
  kicker?: string
  title?: string
  detail?: string
  action?: ReactNode
}) {
  return (
    <View style={{ gap: 6 }}>
      {kicker ? <Text style={ui.eyebrow}>{kicker}</Text> : null}
      {detail ? <Text style={ui.body}>{detail}</Text> : null}
    </View>
  );
}

export function TextButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        minHeight: 36,
        paddingHorizontal: 14,
        borderRadius: 999,
        backgroundColor: colors.button,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={[ui.buttonText, { fontSize: 14 }]}>{label}</Text>
    </Pressable>
  );
}

export function Chips({
  options,
  value,
  onChange,
  compact = false,
  scroll = false,
}: {
  options: readonly { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  compact?: boolean
  /** Keep chips on one horizontal row (saves vertical space). */
  scroll?: boolean
}) {
  const row = (
    <View style={{ flexDirection: "row", flexWrap: scroll ? "nowrap" : "wrap", gap: compact ? 6 : 8 }}>
      {options.map((item) => {
        const active = item.value === value;
        return (
          <Pressable
            key={item.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={item.label}
            onPress={() => onChange(item.value)}
            style={{
              minHeight: compact ? 34 : 44,
              paddingHorizontal: compact ? 12 : 14,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: active ? colors.button : colors.white,
              borderWidth: 1,
              borderColor: active ? colors.button : "rgba(15, 23, 42, 0.12)",
            }}
          >
            <Text style={{ color: active ? colors.onButton : colors.ink, fontFamily: fonts.display, fontSize: compact ? 12 : 13, fontWeight: "600" }}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  if (!scroll) return row;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingRight: 8 }}
    >
      {row}
    </ScrollView>
  );
}

export function SectionLabel({ title }: { title: string }) {
  return (
    <Text style={{ marginTop: 6, color: colors.ink, fontFamily: fonts.display, fontSize: 15, fontWeight: "600" }}>{title}</Text>
  );
}

export function Banner({ text, tone = "error" }: { text: string; tone?: "error" | "ok" }) {
  const ok = tone === "ok";
  return (
    <View
      style={{
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: ok ? colors.brandSoft : "rgba(138, 47, 47, 0.08)",
      }}
    >
      <Text style={ok ? { color: colors.ink, fontFamily: fonts.body, fontSize: 15, lineHeight: 21 } : ui.error}>{text}</Text>
    </View>
  );
}

export function Empty({ title, detail }: { title: string; detail?: string }) {
  return (
    <View style={[ui.surface, { padding: 20, gap: 6 }]}>
      <Text style={ui.cardTitle}>{title}</Text>
      {detail ? <Text style={ui.body}>{detail}</Text> : null}
    </View>
  );
}

export function Panel({ children }: { children: ReactNode }) {
  return <View style={[ui.surface, { padding: 16, gap: 12 }]}>{children}</View>;
}

export function LinkRow({
  title,
  detail,
  onPress,
  icon = "chevron",
}: {
  title: string
  detail?: string
  onPress: () => void
  icon?: IconName
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[ui.card, { flexDirection: "row", alignItems: "center", gap: 12 }]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={ui.cardTitle}>{title}</Text>
        {detail ? <Text style={ui.meta}>{detail}</Text> : null}
      </View>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: colors.brandSoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icon} color={colors.gold} size={16} />
      </View>
    </Pressable>
  );
}

export function HubCard({
  icon,
  title,
  detail,
  onPress,
  wide = false,
}: {
  icon: IconName
  title: string
  detail: string
  onPress: () => void
  wide?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: "transparent" }}
      style={({ pressed }) => [
        ui.surface,
        {
          flex: wide ? undefined : 1,
          minHeight: wide ? 108 : 132,
          padding: 16,
          gap: 10,
          justifyContent: "space-between",
          backgroundColor: colors.white,
          opacity: pressed ? 0.96 : 1,
        },
      ]}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 14,
          backgroundColor: colors.brandSoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icon} color={colors.gold} size={20} />
      </View>
      <View style={{ gap: 4, minWidth: 0 }}>
        <Text style={ui.cardTitle} numberOfLines={2}>{title}</Text>
        <Text style={ui.meta} numberOfLines={3}>{detail}</Text>
      </View>
    </Pressable>
  );
}
