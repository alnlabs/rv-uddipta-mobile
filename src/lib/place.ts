export type AccountRole = {
  role: string
  label: string
};

export type Account = {
  greeting: string
  name: string
  role: string
  roleLabel: string
  place: string
  roles: AccountRole[]
  canSwitch: boolean
  /** True when profiles.flat_id is set (invite / complaints), even if the public flat label failed to load. */
  hasFlat: boolean
  flatNumber: string | null
  wing: string | null
  home: string | null
  needsClaim?: boolean
  needsJoin?: boolean
  joinPending?: boolean
  joinBrowse?: boolean
  joinRequest?: {
    status: "pending" | "approved" | "rejected"
    flatNumber: string | null
    kind: string
    path: string
    reason: string
  } | null
  superAdmin?: boolean
};

export function pathForPlace(place: string) {
  if (place === "gate") return "/(security)/gate";
  if (place === "work") return "/(staff)";
  if (place === "office") return "/(super)";
  return "/(resident)";
}

export function pathForAccount(account: Account) {
  if (account.superAdmin) return "/(super)";
  if (account.needsJoin) return "/(public)/join";
  if (account.joinPending || account.joinBrowse) return "/(public)";
  return pathForPlace(account.place);
}

/**
 * Shells this account may open. Gate/work follow the *active* role (APIs/RLS do too).
 * Facility also keeps home so Manage (bookings/jobs) under /(resident) still works.
 * Super stays in /(super) only.
 */
export function placesForAccount(account: Pick<Account, "role" | "superAdmin" | "place" | "needsJoin" | "joinPending" | "joinBrowse">) {
  if (account.superAdmin) return ["office"];
  if (account.needsJoin || account.joinPending || account.joinBrowse) return ["public"];
  const places = new Set<string>([account.place]);
  const role = account.role;

  if (
    role === "owner"
    || role === "co_owner"
    || role === "tenant"
    || role === "admin"
    || role === "builder"
    || role === "committee"
    || role === "visitor"
    || role === "facility"
  ) {
    places.add("home");
  }
  if (role === "staff" || role === "facility" || role === "admin") places.add("work");
  // Builder (default repairs owner) keeps home; jobs live under /(resident)/jobs via Admin.
  if (role === "security") places.add("gate");

  return [...places];
}

export function canAccessPlace(
  account: Pick<Account, "role" | "superAdmin" | "place" | "needsJoin" | "joinPending" | "joinBrowse">,
  place: string,
) {
  return placesForAccount(account).includes(place);
}

/** Super only uses the (super) stack — never resident/security/staff shells. */
export function superMayVisit(segments: string[]) {
  const root = segments[0];
  if (!root) return true;
  return root === "(super)";
}

export function publicMayVisit(segments: string[]) {
  const root = segments[0];
  if (!root) return true;
  return root === "(public)" || root === "sign-in" || root === "auth";
}
