import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import {
  AdminBanner,
  AdminButton,
  AdminEmpty,
  AdminScreen,
  AdminSheet,
  ops,
} from "@/components/AdminUi";
import { Chips } from "@/components/Blocks";
import { Loading } from "@/components/Screen";
import {
  assignOfficeRole,
  clearOfficeRole,
  createOfficeUser,
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

/** Held office role for display — not limited to assignable chips (admin is hidden from society admins). */
function officeRoleOf(person: RolePerson) {
  if (OFFICE_ROLES.has(person.role)) return person.role;
  return (person.heldRoles || []).find((item) => OFFICE_ROLES.has(item)) || null;
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
  title = "People",
  badge = "Team",
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
  const [filter, setFilter] = useState<"all" | "office" | "security" | "staff" | "facility" | "homes">("office");
  const [createOpen, setCreateOpen] = useState(false);
  const [createPhone, setCreatePhone] = useState("");
  const [createPin, setCreatePin] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createName, setCreateName] = useState("");
  const [createRole, setCreateRole] = useState("security");
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"error" | "ok">("error");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

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
      setCreateRole((current) => (
        desk.roles.some((item) => item.value === current)
          ? current
          : (desk.roles.find((item) => item.value === "security")?.value
            || desk.roles[0]?.value
            || "security")
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
      if (filter === "security" || filter === "staff" || filter === "facility") {
        const desk = officeRoleOf(person);
        if (desk !== filter && !(person.heldRoles || []).includes(filter)) return false;
      }
      if (filter === "homes" && !person.flatNumber) return false;
      if (!q) return true;
      return [person.name, person.email, person.phone || "", person.roleLabel, person.flatNumber || "", ...(person.heldRoles || [])]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [people, query, filter]);

  const selected = selectedId ? people.find((person) => person.userId === selectedId) || null : null;
  const currentOffice = selected ? officeRoleOf(selected) : null;
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
      setMessage(result.message || "Society role removed.");
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

  async function create() {
    if (saving) return;
    setSaving(true);
    setMessage("");
    try {
      const result = await createOfficeUser({
        phone: createPhone,
        pin: createPin,
        email: createEmail,
        role: createRole,
        displayName: createName,
      });
      const createdName = createName.trim() || createPhone.trim();
      const createdRole = result.role || createRole;
      setTone("ok");
      setMessage(result.message || "Staff account ready.");
      setCreatePhone("");
      setCreatePin("");
      setCreateEmail("");
      setCreateName("");
      setCreateOpen(false);
      const roleFilter = (["security", "staff", "facility"].includes(createdRole)
        ? createdRole
        : "office") as "office" | "security" | "staff" | "facility";
      setFilter(roleFilter);
      setQuery("");
      setSearchOpen(false);
      const createdPerson = result.userId ? {
        userId: result.userId,
        name: createdName || result.roleLabel || result.phone || "Team member",
        email: "",
        phone: result.phone || null,
        role: createdRole,
        roleLabel: result.roleLabel || roleLabel(createdRole, roles),
        flatNumber: null as string | null,
        office: true,
        heldRoles: [createdRole],
      } : null;
      if (createdPerson) {
        setPeople((current) => (
          current.some((person) => person.userId === createdPerson.userId)
            ? current
            : [createdPerson, ...current]
        ));
        setSelectedId(createdPerson.userId);
        setDisplayName(createdPerson.name);
        setRole(createdRole);
      }
      await load();
      if (createdPerson) {
        setPeople((current) => (
          current.some((person) => person.userId === createdPerson.userId)
            ? current
            : [createdPerson, ...current]
        ));
        setSelectedId(createdPerson.userId);
        setTone("ok");
        setMessage(result.message || "Staff account ready.");
      }
    } catch (error) {
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Could not create that account.");
    } finally {
      setSaving(false);
    }
  }

  function openPerson(person: RolePerson) {
    if (selectedId === person.userId) {
      setSelectedId(null);
      return;
    }
    const current = officeRoleOf(person);
    setSelectedId(person.userId);
    setRole(current || roles[0]?.value || "facility");
    setDisplayName(person.name);
    setMessage("");
  }

  const fieldStyle = {
    backgroundColor: ops.page,
    borderWidth: 1,
    borderColor: ops.line,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.body,
    fontSize: 15,
    color: ops.ink,
  } as const;

  return (
    <AdminScreen
      title={title}
      badge={badge}
      onRefresh={load}
      busy={!ready && !message}
      search={{
        open: searchOpen,
        value: query,
        placeholder: "Name, phone, email, or home",
        onOpen: () => setSearchOpen(true),
        onClose: () => setSearchOpen(false),
        onChange: setQuery,
        onSubmit: () => setSearchOpen(false),
      }}
      action={(
        <AdminButton
          compact
          label={createOpen ? "Close" : "Create"}
          secondary={createOpen}
          onPress={() => setCreateOpen((open) => !open)}
        />
      )}
      toolbar={(
        <View style={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Chips
                compact
                scroll
                options={[
                  { value: "office", label: "With role" },
                  { value: "security", label: "Security" },
                  { value: "staff", label: "Staff" },
                  { value: "facility", label: "Facility" },
                  { value: "homes", label: "Homes" },
                  { value: "all", label: "All" },
                ]}
                value={filter}
                onChange={(value) => setFilter(value as "all" | "office" | "security" | "staff" | "facility" | "homes")}
              />
            </View>
          </View>
          {createOpen ? (
            <View style={{
              backgroundColor: ops.sheet,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: ops.line,
              padding: 12,
              gap: 8,
            }}
            >
              <Chips
                compact
                scroll
                options={roles.map((item) => ({
                  value: item.value,
                  label: item.value === "facility" ? "Facility" : item.label,
                }))}
                value={createRole}
                onChange={setCreateRole}
              />
              <TextInput
                value={createPhone}
                onChangeText={setCreatePhone}
                keyboardType="phone-pad"
                placeholder="Phone"
                placeholderTextColor="#94a3b8"
                style={fieldStyle}
              />
              <TextInput
                value={createPin}
                onChangeText={setCreatePin}
                keyboardType="number-pad"
                secureTextEntry
                placeholder="PIN (4–6 digits)"
                placeholderTextColor="#94a3b8"
                maxLength={6}
                style={fieldStyle}
              />
              <TextInput
                value={createName}
                onChangeText={setCreateName}
                placeholder="Name (optional)"
                placeholderTextColor="#94a3b8"
                style={fieldStyle}
              />
              <TextInput
                value={createEmail}
                onChangeText={setCreateEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="Email (optional)"
                placeholderTextColor="#94a3b8"
                style={fieldStyle}
              />
              <AdminButton
                label={saving ? "Creating…" : `Create ${roleLabel(createRole, roles)}`}
                disabled={saving || !createPhone.trim() || createPin.replace(/\D/g, "").length < 4}
                onPress={() => { create().catch(() => undefined); }}
              />
            </View>
          ) : null}
        </View>
      )}
    >
      {header}
      {message ? <AdminBanner text={message} tone={tone} /> : null}
      {ready && visible.length === 0 ? <AdminEmpty title="No matching people" /> : null}

      {visible.length ? (
        <AdminSheet>
          {visible.map((person, index) => {
            const office = officeRoleOf(person);
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
                    {person.phone || person.email || person.roleLabel ? (
                      <Text style={{ color: "#64748b", fontFamily: fonts.body, fontSize: 12 }} numberOfLines={1}>
                        {person.phone || person.email || person.roleLabel}
                      </Text>
                    ) : null}
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                      {person.flatNumber ? <Pill label={`Home ${person.flatNumber}`} tone="home" /> : null}
                      {home ? <Pill label={HELD_LABELS[home] || home} tone="home" /> : null}
                      {office ? <Pill label={roleLabel(office, roles)} tone="office" /> : null}
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
                      compact
                      scroll
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
