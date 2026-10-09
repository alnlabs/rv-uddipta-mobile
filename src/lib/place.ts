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
  home: string | null
};

export function pathForPlace(place: string) {
  if (place === "gate") return "/(security)/gate";
  if (place === "work") return "/(staff)";
  return "/(resident)";
}
