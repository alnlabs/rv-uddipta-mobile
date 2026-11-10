import { useCallback, useMemo, useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { SectionLabel } from "@/components/Blocks";
import { Note, Screen } from "@/components/Screen";
import { loadAccount } from "@/lib/community";
import { loadFeatures } from "@/lib/features";
import {
  MIN_QUICK_ACTIONS,
  QUICK_ACTION_CATALOG,
  availableQuickActions,
  loadHomeDisplay,
  patchHomeDisplay,
  type HomeDisplay,
  type QuickActionId,
} from "@/lib/homePrefs";
import { colors, ui } from "@/theme";

function ToggleRow({
  title,
  detail,
  value,
  disabled,
  onChange,
}: {
  title: string
  detail: string
  value: boolean
  disabled?: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={ui.cardTitle}>{title}</Text>
        <Text style={ui.body}>{detail}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: colors.line, true: colors.gold }}
        thumbColor={colors.white}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const [display, setDisplay] = useState<HomeDisplay | null>(null);
  const [features, setFeatures] = useState<string[] | null>(null);
  const [canComplain, setCanComplain] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [home, enabled, account] = await Promise.all([
        loadHomeDisplay(),
        loadFeatures().catch(() => null),
        loadAccount().catch(() => null),
      ]);
      setDisplay(home);
      setFeatures(enabled);
      setCanComplain(Boolean(account && account.role !== "visitor" && account.flatNumber));
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load settings.");
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const choices = useMemo(
    () => availableQuickActions({ features, canComplain }),
    [features, canComplain],
  );

  async function save(patch: Partial<Omit<HomeDisplay, "dismissedIds">>, ok: string) {
    setBusy(true);
    setDisplay((current) => (current ? { ...current, ...patch } : current));
    try {
      setDisplay(await patchHomeDisplay(patch));
      setMessage(ok);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function toggleAction(id: QuickActionId) {
    if (!display || busy) return;
    const on = display.quickActions.includes(id);
    const selectedAvailable = choices.filter((item) => display.quickActions.includes(item.id));
    if (on && selectedAvailable.length <= Math.min(MIN_QUICK_ACTIONS, choices.length)) {
      setMessage(`Keep at least ${Math.min(MIN_QUICK_ACTIONS, choices.length)} quick actions.`);
      return;
    }
    const next = on
      ? display.quickActions.filter((item) => item !== id)
      : [...display.quickActions, id];
    const label = QUICK_ACTION_CATALOG.find((item) => item.id === id)?.label || id;
    await save(
      { quickActions: next },
      on ? `${label} removed from Home.` : `${label} added to Home.`,
    );
  }

  return (
    <Screen title="Settings" onRefresh={load} busy={!display && !message}>
      {message ? <Note text={message} tone="ok" /> : null}

      <SectionLabel title="Customise Home" />
      {display ? (
        <View style={[ui.card, { gap: 16 }]}>
          <ToggleRow
            title="Pinned notices"
            detail="Office-pinned notices at the top of Home."
            value={display.showImportant}
            disabled={busy}
            onChange={(value) => {
              save(
                { showImportant: value },
                value ? "Pinned notices are on." : "Pinned notices are off Home.",
              ).catch(() => undefined);
            }}
          />

          <View style={{ height: 1, backgroundColor: colors.line }} />

          <ToggleRow
            title="My activity"
            detail="Open complaints and events you registered for."
            value={display.showActivity}
            disabled={busy}
            onChange={(value) => {
              save(
                { showActivity: value },
                value ? "My activity is on." : "My activity is off Home.",
              ).catch(() => undefined);
            }}
          />
        </View>
      ) : null}

      <SectionLabel title="Quick actions" />
      {display ? (
        <View style={[ui.card, { gap: 0 }]}>
          <Text style={[ui.body, { marginBottom: 8 }]}>
            Pick what appears in the Home shortcuts button. Keep at least {MIN_QUICK_ACTIONS}.
          </Text>
          {choices.length === 0 ? (
            <Text style={ui.meta}>No shortcuts are open for your account right now.</Text>
          ) : (
            choices.map((item, index) => {
              const on = display.quickActions.includes(item.id);
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  disabled={busy}
                  onPress={() => { toggleAction(item.id).catch(() => undefined); }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingVertical: 12,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: colors.line,
                    opacity: busy ? 0.6 : 1,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={ui.cardTitle}>{item.label}</Text>
                  </View>
                  <Switch
                    value={on}
                    onValueChange={() => { toggleAction(item.id).catch(() => undefined); }}
                    disabled={busy}
                    trackColor={{ false: colors.line, true: colors.gold }}
                    thumbColor={colors.white}
                  />
                </Pressable>
              );
            })
          )}
        </View>
      ) : null}
    </Screen>
  );
}
