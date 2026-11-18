import { LABEL_DEFAULTS } from "@/lib/labelDefaults";
import { supabase } from "@/lib/supabase";

export type SocietyWork = {
  id: number
  key: string
  label: string
  summary: string
  system: boolean
  enabled: boolean
  duration: "regular" | "temporary"
  active: boolean
  role_keys: string[]
};

export type SocietyRoleRow = {
  id: number
  key: string
  label: string
  summary: string
  system: boolean
  enabled: boolean
  maps_to: string | null
  task_keys: string[]
  people_count: number
};

export type SocietyReminder = {
  id: number
  task_id: number
  task_key: string
  task_label: string
  user_id: string | null
  remind_at: string | null
  offset_minutes: number
  anchor: string
  repeat: string
  keep_informed: boolean
  enabled: boolean
  last_sent_at: string | null
};

export type SocietyCatalog = {
  roles: SocietyRoleRow[]
  work: SocietyWork[]
  reminders: SocietyReminder[]
  people_extra: { user_id: string; task_key: string; task_label: string; task_id: number }[]
  labels: Record<string, string>
};

function dbError(error: { message: string } | null, fallback: string) {
  if (!error) return;
  throw new Error(error.message || fallback);
}

export async function loadSocietyLabels(): Promise<Record<string, string>> {
  const { data, error } = await supabase.rpc("list_society_labels");
  if (error || !data || typeof data !== "object") return { ...LABEL_DEFAULTS };
  return { ...LABEL_DEFAULTS, ...(data as Record<string, string>) };
}

export async function loadSocietyCatalog(): Promise<SocietyCatalog> {
  const { data, error } = await supabase.rpc("list_society_catalog");
  dbError(error, "Could not load work and roles.");
  const raw = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  return {
    roles: Array.isArray(raw.roles) ? (raw.roles as SocietyRoleRow[]) : [],
    work: Array.isArray(raw.work) ? (raw.work as SocietyWork[]) : [],
    reminders: Array.isArray(raw.reminders) ? (raw.reminders as SocietyReminder[]) : [],
    people_extra: Array.isArray(raw.people_extra)
      ? (raw.people_extra as SocietyCatalog["people_extra"])
      : [],
    labels: {
      ...LABEL_DEFAULTS,
      ...(raw.labels && typeof raw.labels === "object"
        ? (raw.labels as Record<string, string>)
        : {}),
    },
  };
}

export async function saveSocietyTask(input: {
  id?: number | null
  label: string
  summary?: string
  duration?: string
  enabled?: boolean
}) {
  const { error } = await supabase.rpc("save_society_task", {
    p_id: input.id ?? null,
    p_label: input.label,
    p_summary: input.summary || "",
    p_enabled: input.enabled ?? true,
    p_duration: input.duration || "regular",
    p_starts_at: null,
    p_ends_at: null,
  });
  dbError(error, "Could not save work.");
}

export async function saveSocietyRole(input: {
  id?: number | null
  label: string
  summary?: string
  maps_to?: string
  enabled?: boolean
}) {
  const { error } = await supabase.rpc("save_society_role", {
    p_id: input.id ?? null,
    p_label: input.label,
    p_summary: input.summary || "",
    p_enabled: input.enabled ?? true,
    p_maps_to: input.maps_to || "staff",
  });
  dbError(error, "Could not save role.");
}

export async function setRoleTasks(roleKey: string, taskKeys: string[]) {
  const { error } = await supabase.rpc("set_role_tasks", {
    p_role_key: roleKey,
    p_task_keys: taskKeys,
  });
  dbError(error, "Could not save duties.");
}

export async function setPersonExtraTasks(userId: string, taskKeys: string[]) {
  const { error } = await supabase.rpc("set_person_extra_tasks", {
    p_user_id: userId,
    p_task_keys: taskKeys,
  });
  dbError(error, "Could not save extra duty.");
}

export async function saveSocietyReminder(input: {
  id?: number | null
  taskKey: string
  remindAt?: string | null
  anchor?: string
  repeat?: string
  keepInformed?: boolean
  enabled?: boolean
  offsetMinutes?: number
}) {
  const { error } = await supabase.rpc("save_society_reminder", {
    p_id: input.id ?? null,
    p_task_key: input.taskKey,
    p_user_id: null,
    p_remind_at: input.remindAt || null,
    p_offset_minutes: input.offsetMinutes ?? 0,
    p_anchor: input.anchor || "absolute",
    p_repeat: input.repeat || "none",
    p_keep_informed: input.keepInformed ?? true,
    p_enabled: input.enabled ?? true,
  });
  dbError(error, "Could not save reminder.");
}

export async function flushDueReminders() {
  const { data, error } = await supabase.rpc("flush_due_society_reminders");
  dbError(error, "Could not send reminders.");
  const sent =
    data && typeof data === "object" && "sent" in data
      ? Number((data as { sent: number }).sent)
      : 0;
  return sent;
}

export type SocietyArea = {
  areaKey: string
  label: string
  ownerRole: string
  currentOwnerRole: string
  startsAt: string | null
  endsAt: string | null
  summary: string
};

export async function loadSocietyAreas(): Promise<SocietyArea[]> {
  const { data, error } = await supabase.rpc("list_society_areas");
  dbError(error, "Could not load areas.");
  if (!Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((row) => ({
    areaKey: String(row.areaKey || row.area_key || ""),
    label: String(row.label || ""),
    ownerRole: String(row.ownerRole || row.owner_role || ""),
    currentOwnerRole: String(row.currentOwnerRole || row.current_owner_role || ""),
    startsAt: row.startsAt || row.starts_at ? String(row.startsAt || row.starts_at) : null,
    endsAt: row.endsAt || row.ends_at ? String(row.endsAt || row.ends_at) : null,
    summary: String(row.summary || ""),
  }));
}

export async function saveSocietyArea(input: {
  areaKey: string
  ownerRole: string
  summary?: string
  startsAt?: string | null
  endsAt?: string | null
}) {
  const { error } = await supabase.rpc("save_society_area", {
    p_area_key: input.areaKey,
    p_owner_role: input.ownerRole,
    p_starts_at: input.startsAt || null,
    p_ends_at: input.endsAt || null,
    p_summary: input.summary || null,
  });
  dbError(error, "Could not save area.");
}
