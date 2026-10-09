import { StyleSheet } from "react-native";

/** Same tokens as the website in app/globals.css. */
export const colors = {
  page: "#f8fafc",
  ink: "#0f172a",
  muted: "#475569",
  gold: "#059669",
  goldInk: "#b45309",
  brandSoft: "rgba(5, 150, 105, 0.14)",
  line: "#e2e8f0",
  button: "#1e293b",
  onButton: "#f8fafc",
  white: "#ffffff",
  danger: "#8a2f2f",
  placeholder: "#8a9a90",
};

/** Headings, buttons, and navigation use Manrope. Body copy uses Hanken Grotesk. */
export const fonts = {
  display: "Manrope_600SemiBold",
  body: "HankenGrotesk_400Regular",
};

export const tabBar = {
  headerShown: false,
  tabBarActiveTintColor: colors.button,
  tabBarInactiveTintColor: colors.muted,
  tabBarStyle: {
    backgroundColor: colors.white,
    borderTopColor: "rgba(15, 23, 42, 0.1)",
    borderTopWidth: 1,
  },
  tabBarLabelStyle: {
    fontFamily: fonts.display,
    fontSize: 11,
    fontWeight: "600" as const,
  },
  tabBarItemStyle: {
    paddingTop: 4,
  },
  sceneStyle: { backgroundColor: colors.page },
};

export const ui = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.page,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 14,
  },
  eyebrow: {
    color: colors.goldInk,
    fontFamily: fonts.display,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.9,
    textTransform: "uppercase",
  },
  title: {
    color: colors.ink,
    fontFamily: fonts.display,
    fontSize: 32,
    fontWeight: "600",
    letterSpacing: -0.4,
  },
  body: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.1)",
  },
  label: {
    color: colors.goldInk,
    fontFamily: fonts.display,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  cardTitle: {
    color: colors.ink,
    fontFamily: fonts.display,
    fontSize: 18,
    fontWeight: "600",
  },
  field: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.16)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
  },
  button: {
    backgroundColor: colors.button,
    borderRadius: 999,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  buttonText: {
    color: colors.onButton,
    fontFamily: fonts.display,
    fontSize: 16,
    fontWeight: "600",
  },
  error: {
    color: colors.danger,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 21,
  },
  quiet: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    minHeight: 44,
  },
  quietText: {
    color: colors.muted,
    fontFamily: fonts.display,
    fontSize: 15,
    fontWeight: "600" as const,
  },
  surface: {
    backgroundColor: colors.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    shadowColor: "#0f172a",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  meta: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
});
