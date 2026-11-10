import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import {
  AdminBanner,
  AdminButton,
  AdminEmpty,
  AdminField,
  AdminScreen,
  AdminSheet,
  ops,
} from "@/components/AdminUi";
import { Chips } from "@/components/Blocks";
import { Loading } from "@/components/Screen";
import {
  assignOfficeRole,
  clearOfficeRole,
  loadRolesDesk,
  type OfficeRoleOption,
  type RolePerson,
} from "@/lib/rolesDesk";
import { fonts } from "@/theme";

const OFFICE_ROLES = new Set(["admin", "builder", "committee", "facility", "staff", "security"]);
const HOME_ROLES = new Set(["owner", "co_owner", "tenant"]);

const HELD_LABELS: Record<string, string> = {
  admin: "Admin",
  builder: "Builder",
  committee: "Committee",
  facility: "Facility",
  staff: "Staff",
  security: "Security",
  owner: "Owner",
  co_owner: "Family",
  tenant: "Tenant",
};

function roleLabel(value: string, roles: OfficeRoleOption[]) {
  if (value === "facility") return "Facility";
  const match = roles.find((item) => item.value === value);
  if (match?.label) return match.label;
  return HELD_LABELS[value] || value;
}

function officeRoleOf(person: RolePerson, roles: OfficeRoleOption[]) {
  if (OFFICE_ROLES.has(person.role) && roles.some((item) => item.value === person.role)) {
    return person.role;
  }
  return (person.heldRoles || []).find((item) => roles.some((option) => option.value === item)) || null;
}

function homeRoleOf(person: RolePerson) {
  if (HOME_ROLES.has(person.role)) return person.role;
  return (person.heldRoles || []).find((item) => HOME_ROLES.has(item)) || null;
}

function initial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function Pill({
  label,
  tone = "mute",
}: {
  label: string
  tone?: "office" | "home" | "mute"
}) {
  const bg = tone === "office" ? ops.badge : tone === "home" ? "rgba(5,150,105,0.12)" : ops.page;
  const color = tone === "office" ? ops.badgeText : tone === "home" ? "#047857" : "#64748b";
  return (
    <View style={{ backgroundColor: bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
      <Text style={{ color, fontFamily: fonts.display, fontSize: 11, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

export function RolesAssign({
  title = "Team roles",
  badge = "Office",
  header,
}: {
  title?: string
  intro?: string
  badge?: string
  header?: ReactNode
}) {
  const [people, setPeople] = useState<RolePerson[]>([]);
  const [roles, setRoles] = useState<OfficeRoleOption[]>([]);
  const [canAssignAdmin, setCanAssignAdmin] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [role, setRole] = useState("facility");
  const [displayName, setDisplayName] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "office" | "outside" | "homes">("all");
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"error" | "ok">("error");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const desk = await loadRolesDesk();
      setPeople(desk.people);
      setRoles(desk.roles);
      setCanAssignAdmin(desk.canAssignAdmin);
      setRole((current) => (
        desk.roles.some((item) => item.value === current)
          ? current
          : (desk.roles[0]?.value || "facility")
      ));
      setSelectedId((current) => (
        current && desk.people.some((person) => person.userId === current) ? current : null
      ));
      setMessage("");
    } catch (error) {
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Could not load people.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people.filter((person) => {
      if (filter === "office" && !person.office) return false;
      if (filter === "outside" && person.flatNumber) return false;
      if (filter === "homes" && !person.flatNumber) return false;
      if (!q) return true;
      return [person.name, person.email, person.roleLabel, person.flatNumber || "", ...(person.heldRoles || [])]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [people, query, filter]);

  const selected = selectedId ? people.find((person) => person.userId === selectedId) || null : null;
  const currentOffice = selected ? officeRoleOf(selected, roles) : null;
  const alreadyAssigned = Boolean(currentOffice);
  const sameRole = Boolean(currentOffice && currentOffice === role);
  const canRemove = Boolean(
    selected
    && alreadyAssigned
    && (canAssignAdmin || selected.role !== "admin"),
  );
  const chosenLabel = roleLabel(role, roles);

  async function save() {
    if (!selected || saving) return;
    setSaving(true);
    setMessage("");
    try {
      const result = await assignOfficeRole({
        userId: selected.userId,
        role,
        displayName,
      });
      setTone("ok");
      setMessage(result.message || `${chosenLabel} assigned.`);
      setSelectedId(null);
      setDisplayName("");
      await load();
    } catch (error) {
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Could not save that role.");
    } finally {
      setSaving(false);
    }
  }

  async function clear() {
    if (!selected || saving) return;
    setSaving(true);
    setMessage("");
    try {
      const result = await clearOfficeRole(selected.userId);
      setTone("ok");
      setMessage(result.message || "Office role removed.");
      setSelectedId(null);
      setDisplayName("");
      await load();
    } catch (error) {
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Could not remove that role.");
    } finally {
      setSaving(false);
    }
  }

  function openPerson(person: RolePerson) {
    if (selectedId === person.userId) {
      setSelectedId(null);
      return;
    }
    const current = officeRoleOf(person, roles);
    setSelectedId(person.userId);
    setRole(current || roles[0]?.value || "facility");
    setDisplayName(person.name);
    setMessage("");
  }

  return (
    <AdminScreen title={title} badge={badge} onRefresh={load} busy={!ready && !message}>
      {header}
      <AdminField
        value={query}
        onChangeText={setQuery}
        placeholder="Name, email, or home"
      />
      <View style={{ paddingHorizontal: 16, paddingBottom: 10, gap: 8 }}>
        <Text style={{ color: "#64748b", fontFamily: fonts.body, fontSize: 13, lineHeight: 18 }}>
          Outside staff sign in with Google first. Then assign Security, Facility, Staff, or other roles this society uses.
        </Text>
        <Chips
          options={[
            { value: "all", label: "All" },
            { value: "outside", label: "Outside" },
            { value: "office", label: "Office" },
            { value: "homes", label: "Homes" },
          ]}
          value={filter}
          onChange={(value) => setFilter(value as "all" | "office" | "outside" | "homes")}
        />
      </View>
      {message ? <AdminBanner text={message} tone={tone} /> : null}
      {ready && visible.length === 0 ? <AdminEmpty title="No matching people" /> : null}

      {visible.length ? (
        <AdminSheet>
          {visible.map((person, index) => {
            const office = officeRoleOf(person, roles);
            const home = homeRoleOf(person);
            const open = selectedId === person.userId;
            const last = index === visible.length - 1 && !open;

            return (
              <View
                key={person.userId}
                style={{
                  borderBottomWidth: last ? 0 : 1,
                  borderBottomColor: ops.line,
                  backgroundColor: open ? "#f8fafc" : ops.sheet,
                }}
              >
                <Pressable
                  onPress={() => openPerson(person)}
                  style={{ flexDirection: "row", gap: 12, paddingHorizontal: 14, paddingVertical: 14, alignItems: "center" }}
                >
                  <View style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: office ? ops.badge : "rgba(5,150,105,0.12)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  >
                    <Text style={{
                      color: office ? ops.badgeText : "#047857",
                      fontFamily: fonts.display,
                      fontSize: 16,
                      fontWeight: "600",
                    }}
                    >
                      {initial(person.name)}
                    </Text>
                  </View>

                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: ops.ink, fontFamily: fonts.display, fontSize: 15, fontWeight: "600" }} numberOfLines={1}>
                      {person.name}
                    </Text>
                    {person.email || person.roleLabel ? (
                      <Text style={{ color: "#64748b", fontFamily: fonts.body, fontSize: 12 }} numberOfLines={1}>
                        {person.email || person.roleLabel}
                      </Text>
                    ) : null}
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                      {person.flatNumber ? <Pill label={`Home ${person.flatNumber}`} tone="home" /> : null}
                      {home ? <Pill label={HELD_LABELS[home] || home} tone="home" /> : null}
                      {office ? (
                        <Pill label={roleLabel(office, roles)} tone="office" />
                      ) : (
                        <Pill label="No office role" />
                      )}
                    </View>
                  </View>

                  <View style={{
                    minWidth: 72,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    backgroundColor: office ? ops.header : ops.action,
                    alignItems: "center",
                  }}
                  >
                    <Text style={{ color: ops.actionText, fontFamily: fonts.display, fontSize: 12, fontWeight: "600" }}>
                      {open ? "Close" : office ? "Change" : "Assign"}
                    </Text>
                  </View>
                </Pressable>

                {open ? (
                  <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 10 }}>
                    <Chips
                      options={roles.map((item) => ({
                        value: item.value,
                        label: item.value === "facility" ? "Facility" : item.label,
                      }))}
                      value={role}
                      onChange={setRole}
                    />
                    <TextInput
                      value={displayName}
                      onChangeText={setDisplayName}
                      placeholder="Display name"
                      placeholderTextColor="#94a3b8"
                      style={{
                        backgroundColor: ops.sheet,
                        borderWidth: 1,
                        borderColor: ops.line,
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 11,
                        fontFamily: fonts.body,
                        fontSize: 15,
                        color: ops.ink,
                      }}
                    />
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        {sameRole ? (
                          <AdminButton label={`Already ${chosenLabel}`} disabled onPress={() => undefined} />
                        ) : (
                          <AdminButton
                            label={
                              saving
                                ? "Saving…"
                                : alreadyAssigned
                                  ? `Change to ${chosenLabel}`
                                  : `Assign ${chosenLabel}`
                            }
                            disabled={saving}
                            onPress={() => { save().catch(() => undefined); }}
                          />
                        )}
                      </View>
                    </View>
                    {canRemove ? (
                      <AdminButton
                        label={saving ? "Working…" : `Remove ${roleLabel(currentOffice || "", roles)}`}
                        secondary
                        disabled={saving}
                        onPress={() => { clear().catch(() => undefined); }}
                      />
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })}
        </AdminSheet>
      ) : null}
    </AdminScreen>
  );
}
