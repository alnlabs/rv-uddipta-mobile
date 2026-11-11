import { normalizePhone, STAFF_EMAIL_DOMAIN } from "@/lib/phone";
import { siteUrl } from "@/lib/site";
import { supabase } from "@/lib/supabase";

export type OfficeRoleOption = { value: string; label: string };

export type RolePerson = {
  userId: string
  name: string
  email: string
  phone: string | null
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
const SOCIETY_ROLES = new Set(["admin", "builder", "committee", "facility", "staff", "security"]);
const HOME_ROLES = new Set(["owner", "co_owner", "tenant"]);

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

/** Phone from synthetic staff login email (phone@owners.rvuddipta.app). */
function phoneFromStaffEmail(email: string) {
  const value = email.trim().toLowerCase();
  const suffix = `@${STAFF_EMAIL_DOMAIN.toLowerCase()}`;
  if (!value.endsWith(suffix)) return null;
  return normalizePhone(value.slice(0, -suffix.length));
}

/** Drop UUID / long-digit junk used as display names — keep real 10-digit phones. */
function junkToken(value: string) {
  const v = value.trim();
  if (!v) return true;
  if (UUID_RE.test(v)) return true;
  if (normalizePhone(v)) return false;
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

function niceName(raw: string, email: string, phone: string | null) {
  const value = raw.trim();
  if (value && !junkToken(value)) return value;
  if (phone && (!value || normalizePhone(value) === phone || junkToken(value))) return phone;
  const local = email.split("@")[0]?.trim() || "";
  if (local && !junkToken(local)) return titleCaseLocal(local);
  return phone || "Signed-in person";
}

/** Real email, or blank when the login is a synthetic staff phone email. */
function niceEmail(email: string, phone: string | null) {
  if (phone) return "";
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
  const phoneRaw = pick(row, "phone");
  const phone = normalizePhone(String(phoneRaw || "")) || phoneFromStaffEmail(rawEmail);
  const email = niceEmail(rawEmail, phone);
  const role = String(pick(row, "role") || "visitor").trim() || "visitor";
  const flatNumberRaw = pick(row, "flat_number", "flatNumber");
  const flatNumber = flatNumberRaw ? String(flatNumberRaw) : null;
  const heldRaw = pick(row, "held_roles", "heldRoles");
  const heldRoles = Array.isArray(heldRaw) ? heldRaw.map(String) : [];
  const hasSocietyRole = SOCIETY_ROLES.has(role) || heldRoles.some((item) => SOCIETY_ROLES.has(item));
  const officeFlag = pick(row, "office");
  const office = (officeFlag == null ? false : Boolean(officeFlag)) || hasSocietyRole;

  let roleLabel = String(pick(row, "role_label", "roleLabel") || "").trim();
  if (!roleLabel || roleLabel.toLowerCase() === "visitor" || junkToken(roleLabel)) {
    if (flatNumber && (role === "visitor" || !role)) roleLabel = "Home member";
    else roleLabel = ROLE_LABELS[role] || "Signed in";
  }

  let name = niceName(String(pick(row, "name", "display_name", "displayName") || ""), rawEmail, phone);
  if (hasSocietyRole && (name === "Signed-in person" || junkToken(name))) {
    name = phone
      ? `${ROLE_LABELS[role] || roleLabel || "Staff"} ${phone.slice(-4)}`
      : (ROLE_LABELS[role] || roleLabel || "Staff");
  }
  const homeHeld = heldRoles.some((item) => HOME_ROLES.has(item)) || HOME_ROLES.has(role);

  // Keep society-role people always. Drop anonymous visitors without a real identity.
  if (hasSocietyRole || office) {
    // always keep
  } else if (!homeHeld && !flatNumber) {
    if (!email || name === "Signed-in person" || junkToken(name)) return null;
  } else if (name === "Signed-in person" && !email && !phone) {
    return null;
  }

  return {
    userId,
    name,
    email,
    phone,
    role,
    roleLabel,
    flatNumber,
    office: office || hasSocietyRole,
    heldRoles,
  };
}

function deskFromPayload(payload: Record<string, unknown>): RolesDesk {
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

/** Prefer portal admin API (same path as create). Fall back to RPC if the site is down. */
export async function loadRolesDesk(): Promise<RolesDesk> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (token) {
    try {
      const response = await fetch(`${siteUrl}/api/mobile/office-users`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
      if (response.ok) return deskFromPayload(payload);
      // Deployed API auth/business errors — don't hide behind RPC.
      if (response.status === 401 || response.status === 403 || response.status === 400) {
        throw new Error(String(payload.message || "Could not load people."));
      }
    } catch (error) {
      if (error instanceof Error && !/network|fetch|failed to fetch/i.test(error.message)) {
        throw error;
      }
    }
  }

  const { data, error } = await supabase.rpc("list_office_people");
  dbError(error, "Could not load people.");
  return deskFromPayload((data && typeof data === "object" ? data : {}) as Record<string, unknown>);
}

export async function setOfficeRolesEnabled(roles: string[]) {
  const { data, error } = await supabase.rpc("set_office_roles_enabled", {
    next_roles: roles,
  });
  dbError(error, "Could not save society roles.");
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

/** Create staff with phone + PIN (email optional) via the portal admin API. */
export async function createOfficeUser(input: {
  phone: string
  pin: string
  role: string
  displayName?: string
  email?: string
}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Sign in first.");

  const response = await fetch(`${siteUrl}/api/mobile/office-users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone: input.phone,
      pin: input.pin,
      email: input.email || "",
      role: input.role,
      displayName: input.displayName || "",
    }),
  });
  const payload = await response.json().catch(() => ({})) as {
    message?: string
    ok?: boolean
    roleLabel?: string
  };
  if (!response.ok) {
    throw new Error(payload.message || "Could not create that account.");
  }
  return payload as {
    ok: boolean
    created: boolean
    userId: string
    phone: string
    email: string | null
    role: string
    roleLabel: string
    message: string
  };
}
