import { supabase } from "@/lib/supabase";

export type OfficeRoleOption = { value: string; label: string };

export type RolePerson = {
  userId: string
  name: string
  email: string
  role: string
  roleLabel: string
  flatNumber: string | null
  office: boolean
  heldRoles: string[]
};

export type RolesDesk = {
  roles: OfficeRoleOption[]
  people: RolePerson[]
  canAssignAdmin: boolean
  catalog: OfficeRoleOption[]
  enabledRoles: string[]
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  builder: "Builder",
  committee: "Committee",
  facility: "Facility manager",
  staff: "Service staff",
  security: "Security",
  owner: "Owner",
  co_owner: "Family",
  tenant: "Tenant",
  visitor: "Signed in · no home yet",
};

function dbError(error: { message: string } | null, fallback: string) {
  if (!error) return;
  throw new Error(error.message || fallback);
}

function pick(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (row[key] != null && String(row[key]).trim() !== "") return row[key];
  }
  return null;
}

/** Drop UUID / phone-id / long-digit junk used as display names. */
function junkToken(value: string) {
  const v = value.trim();
  if (!v) return true;
  if (UUID_RE.test(v)) return true;
  if (/^\d+$/.test(v)) return true;
  if (/^[0-9a-f]{16,}$/i.test(v)) return true;
  if (/^\+?\d[\d\s-]{6,}$/.test(v)) return true;
  return false;
}

function titleCaseLocal(local: string) {
  return local
    .replace(/[._+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function niceName(raw: string, email: string) {
  const value = raw.trim();
  if (value && !junkToken(value)) return value;
  const local = email.split("@")[0]?.trim() || "";
  if (local && !junkToken(local)) return titleCaseLocal(local);
  return "Signed-in person";
}

/** Only show a real-looking email under the name. */
function niceEmail(email: string) {
  const value = email.trim();
  if (!EMAIL_RE.test(value)) return "";
  const local = value.split("@")[0] || "";
  if (junkToken(local)) return "";
  return value;
}

function asPerson(row: Record<string, unknown>): RolePerson | null {
  const userId = String(pick(row, "user_id", "userId", "id") || "").trim();
  if (!userId) return null;

  const rawEmail = String(pick(row, "email") || "").trim();
  const email = niceEmail(rawEmail);
  const role = String(pick(row, "role") || "visitor").trim() || "visitor";
  const flatNumberRaw = pick(row, "flat_number", "flatNumber");
  const flatNumber = flatNumberRaw ? String(flatNumberRaw) : null;
  const heldRaw = pick(row, "held_roles", "heldRoles");
  const heldRoles = Array.isArray(heldRaw) ? heldRaw.map(String) : [];
  const office = Boolean(pick(row, "office") ?? heldRoles.some((item) => (
    ["admin", "builder", "committee", "facility", "staff", "security"].includes(item)
  )));

  let roleLabel = String(pick(row, "role_label", "roleLabel") || "").trim();
  if (!roleLabel || roleLabel.toLowerCase() === "visitor" || junkToken(roleLabel)) {
    if (flatNumber && (role === "visitor" || !role)) roleLabel = "Home member";
    else roleLabel = ROLE_LABELS[role] || "Signed in";
  }

  const name = niceName(String(pick(row, "name", "display_name", "displayName") || ""), rawEmail);
  // Skip empty auth shells with no usable identity.
  if (name === "Signed-in person" && !email && !flatNumber && !office && role === "visitor") {
    return null;
  }

  return {
    userId,
    name,
    email,
    role,
    roleLabel,
    flatNumber,
    office,
    heldRoles,
  };
}

export async function loadRolesDesk(): Promise<RolesDesk> {
  const { data, error } = await supabase.rpc("list_office_people");
  dbError(error, "Could not load people.");
  const payload = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const rolesRaw = payload.roles;
  const peopleRaw = payload.people;
  const roles = Array.isArray(rolesRaw)
    ? rolesRaw.map((item) => {
      const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
      return {
        value: String(row.value || ""),
        label: String(row.label || row.value || ""),
      };
    }).filter((item) => item.value)
    : [];
  const people = Array.isArray(peopleRaw)
    ? peopleRaw
      .map((item) => asPerson((item && typeof item === "object" ? item : {}) as Record<string, unknown>))
      .filter((item): item is RolePerson => Boolean(item))
    : [];

  const catalogRaw = payload.catalog;
  const catalog = Array.isArray(catalogRaw)
    ? catalogRaw.map((item) => {
      const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
      return {
        value: String(row.value || ""),
        label: String(row.label || row.value || ""),
      };
    }).filter((item) => item.value)
    : roles;
  const enabledRaw = pick(payload, "enabled_roles", "enabledRoles");
  const enabledRoles = Array.isArray(enabledRaw)
    ? enabledRaw.map(String)
    : roles.map((item) => item.value);

  return {
    roles,
    people,
    canAssignAdmin: Boolean(pick(payload, "can_assign_admin", "canAssignAdmin")),
    catalog,
    enabledRoles,
  };
}

export async function setOfficeRolesEnabled(roles: string[]) {
  const { data, error } = await supabase.rpc("set_office_roles_enabled", {
    next_roles: roles,
  });
  dbError(error, "Could not save office roles.");
  return data as { ok: boolean; roles: string[] };
}

export async function assignOfficeRole(input: {
  userId: string
  role: string
  displayName?: string
}) {
  const { data, error } = await supabase.rpc("assign_office_role", {
    target_user: input.userId,
    next_role: input.role,
    display_name: input.displayName || "",
  });
  dbError(error, "Could not save that role.");
  return data as { ok: boolean; message: string; role: string; roleLabel: string };
}

export async function clearOfficeRole(userId: string) {
  const { data, error } = await supabase.rpc("clear_office_role", {
    target_user: userId,
  });
  dbError(error, "Could not remove that role.");
  return data as { ok: boolean; message: string };
}
