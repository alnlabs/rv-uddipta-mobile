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
  flatNumber: string | null
  wing: string | null
  home: string | null
  needsClaim?: boolean
  superAdmin?: boolean
};

export function pathForPlace(place: string) {
  if (place === "gate") return "/(security)/gate";
  if (place === "work") return "/(staff)";
  if (place === "office") return "/(super)";
  return "/(resident)";
}

/**
 * Shells this account may open. Gate/work follow the *active* role (APIs/RLS do too).
 * Facility also keeps home so Manage (bookings/jobs) under /(resident) still works.
 * Super stays in /(super) only.
 */
export function placesForAccount(account: Pick<Account, "role" | "superAdmin" | "place">) {
  if (account.superAdmin) return ["office"];
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
  if (role === "security" || role === "admin") places.add("gate");

  return [...places];
}

export function canAccessPlace(
  account: Pick<Account, "role" | "superAdmin" | "place">,
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
