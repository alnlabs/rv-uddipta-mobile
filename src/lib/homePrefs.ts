import * as SecureStore from "expo-secure-store";
import type { IconName } from "@/components/Icon";

const DISPLAY_KEY = "rv_home_display_v1";
const LEGACY_DISMISSED_KEY = "rv_home_dismissed_notices_v1";

export type QuickActionId =
  | "maintenance"
  | "complaint"
  | "announcements"
  | "status"
  | "visitors"
  | "events";

export type QuickActionDef = {
  id: QuickActionId
  label: string
  icon: IconName
  href: string
  feature?: string
  needsFlat?: boolean
};

/** Full catalogue — Home and Settings filter by features / flat. */
export const QUICK_ACTION_CATALOG: QuickActionDef[] = [
  { id: "maintenance", label: "Maintenance", icon: "schedule", href: "/(resident)/maintenance", feature: "maintenance" },
  { id: "complaint", label: "Raise complaint", icon: "form", href: "/(resident)/request/new", feature: "requests", needsFlat: true },
  { id: "announcements", label: "Announcements", icon: "bell", href: "/(resident)/notices", feature: "announcements" },
  { id: "status", label: "Community status", icon: "floors", href: "/(resident)/status", feature: "building" },
  { id: "visitors", label: "Visitors", icon: "people", href: "/(resident)/history", feature: "visitor_passes" },
  { id: "events", label: "Events", icon: "feed", href: "/(resident)/events", feature: "events" },
];

const ALL_ACTION_IDS = QUICK_ACTION_CATALOG.map((item) => item.id);

export type HomeDisplay = {
  showImportant: boolean
  showActivity: boolean
  /** Chosen quick-action ids. At least MIN_QUICK_ACTIONS. */
  quickActions: QuickActionId[]
  dismissedIds: number[]
};

const defaults: HomeDisplay = {
  showImportant: true,
  showActivity: true,
  quickActions: [...ALL_ACTION_IDS],
  dismissedIds: [],
};

function normalizeIds(ids: unknown): number[] {
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids.map(Number).filter((id) => Number.isFinite(id) && id > 0))];
}

export const MIN_QUICK_ACTIONS = 2;

function normalizeActionIds(ids: unknown, legacyShowAll?: boolean): QuickActionId[] {
  if (!Array.isArray(ids)) {
    // Old “all off” becomes the minimum set, not an empty FAB.
    if (legacyShowAll === false) return ALL_ACTION_IDS.slice(0, MIN_QUICK_ACTIONS);
    return [...ALL_ACTION_IDS];
  }
  const allowed = new Set<string>(ALL_ACTION_IDS);
  const picked = [...new Set(ids.map(String).filter((id): id is QuickActionId => allowed.has(id)))];
  if (picked.length >= MIN_QUICK_ACTIONS) return picked;
  for (const id of ALL_ACTION_IDS) {
    if (!picked.includes(id)) picked.push(id);
    if (picked.length >= MIN_QUICK_ACTIONS) break;
  }
  return picked;
}

function normalizeDisplay(raw: unknown): HomeDisplay {
  if (!raw || typeof raw !== "object") return { ...defaults, quickActions: [...ALL_ACTION_IDS] };
  const value = raw as Record<string, unknown>;
  const hasQuickList = Array.isArray(value.quickActions);
  return {
    showImportant: value.showImportant !== false,
    showActivity: value.showActivity !== false,
    quickActions: hasQuickList
      ? normalizeActionIds(value.quickActions)
      : normalizeActionIds(null, value.showQuickActions !== false),
    dismissedIds: normalizeIds(value.dismissedIds),
  };
}

async function writeDisplay(next: HomeDisplay) {
  try {
    await SecureStore.setItemAsync(DISPLAY_KEY, JSON.stringify(next));
  } catch {
    // Keep caller state if SecureStore fails on this device.
  }
  return next;
}

export async function loadHomeDisplay(): Promise<HomeDisplay> {
  try {
    const raw = await SecureStore.getItemAsync(DISPLAY_KEY);
    if (raw) return normalizeDisplay(JSON.parse(raw) as unknown);

    const legacy = await SecureStore.getItemAsync(LEGACY_DISMISSED_KEY).catch(() => null);
    if (legacy) {
      const migrated = normalizeDisplay({
        ...defaults,
        dismissedIds: JSON.parse(legacy) as unknown,
      });
      await writeDisplay(migrated);
      await SecureStore.deleteItemAsync(LEGACY_DISMISSED_KEY).catch(() => undefined);
      return migrated;
    }
  } catch {
    return { ...defaults, quickActions: [...ALL_ACTION_IDS] };
  }
  return { ...defaults, quickActions: [...ALL_ACTION_IDS] };
}

export async function patchHomeDisplay(
  patch: Partial<Omit<HomeDisplay, "dismissedIds">> & { quickActions?: QuickActionId[] },
) {
  const current = await loadHomeDisplay();
  const next: HomeDisplay = {
    ...current,
    ...patch,
    quickActions: patch.quickActions
      ? normalizeActionIds(patch.quickActions)
      : current.quickActions,
  };
  return writeDisplay(next);
}

export async function dismissHomeNotices(ids: number[]) {
  const current = await loadHomeDisplay();
  return writeDisplay({
    ...current,
    dismissedIds: normalizeIds([...current.dismissedIds, ...ids]),
  });
}

export function availableQuickActions(input: {
  features: string[] | null
  canComplain: boolean
  selected?: QuickActionId[] | null
}) {
  const featureOn = (key?: string) => !key || input.features == null || input.features.includes(key);
  const catalog = QUICK_ACTION_CATALOG.filter((item) => {
    if (item.needsFlat && !input.canComplain) return false;
    return featureOn(item.feature);
  });
  if (!input.selected) return catalog;
  const picked = new Set(input.selected);
  return catalog.filter((item) => picked.has(item.id));
}
