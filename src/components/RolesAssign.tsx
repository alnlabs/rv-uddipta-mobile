import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Dimensions, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  officeRoleHelp,
  PEOPLE_ROLE_GUIDE,
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

function RolePicker({
  label = "Role",
  options,
  value,
  onChange,
}: {
  label?: string
  options: OfficeRoleOption[]
  value: string
  onChange: (value: string) => void
}) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const chosen = roleLabel(value, options);
  const help = officeRoleHelp(value);

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: "#64748b", fontFamily: fonts.display, fontSize: 11, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase" }}>
        {label}
      </Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          minHeight: 44,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: ops.line,
          backgroundColor: ops.page,
          paddingHorizontal: 12,
          paddingVertical: 11,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Text style={{ color: ops.ink, fontFamily: fonts.body, fontSize: 15, flex: 1 }} numberOfLines={1}>
          {chosen}
        </Text>
        <Text style={{ color: "#64748b", fontFamily: fonts.display, fontSize: 12, fontWeight: "600" }}>
          Change
        </Text>
      </Pressable>
      {help ? (
        <Text style={{ color: "#64748b", fontFamily: fonts.body, fontSize: 12, lineHeight: 16 }} numberOfLines={2}>
          {help}
        </Text>
      ) : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(15, 23, 42, 0.45)", justifyContent: "flex-end" }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => setOpen(false)}
            style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
          />
          <View
            style={{
              height: Math.round(Dimensions.get("window").height * 0.72),
              backgroundColor: ops.sheet,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              paddingTop: 14,
              paddingBottom: Math.max(insets.bottom, 16),
            }}
          >
            <View style={{
              paddingHorizontal: 16,
              paddingBottom: 10,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
            >
              <Text style={{ color: ops.ink, fontFamily: fonts.display, fontSize: 16, fontWeight: "600", flex: 1 }}>
                Pick a role
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={() => setOpen(false)}
                hitSlop={8}
                style={{
                  minWidth: 64,
                  minHeight: 36,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: ops.line,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 12,
                  backgroundColor: ops.page,
                }}
              >
                <Text style={{ color: ops.ink, fontFamily: fonts.display, fontSize: 13, fontWeight: "600" }}>
                  Close
                </Text>
              </Pressable>
            </View>
            <ScrollView
              style={{ flex: 1, paddingHorizontal: 16 }}
              contentContainerStyle={{ gap: 6, paddingBottom: 8 }}
              showsVerticalScrollIndicator
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {options.map((item) => {
                const active = item.value === value;
                const name = item.value === "facility" ? "Facility" : item.label;
                const tip = officeRoleHelp(item.value);
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                    style={{
                      minHeight: 52,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      justifyContent: "center",
                      backgroundColor: active ? ops.badge : ops.page,
                      borderWidth: 1,
                      borderColor: active ? "#f59e0b" : ops.line,
                      gap: 4,
                    }}
                  >
                    <Text style={{
                      color: active ? ops.badgeText : ops.ink,
                      fontFamily: fonts.display,
                      fontSize: 15,
                      fontWeight: "600",
                    }}
                    >
                      {name}
                    </Text>
                    {tip ? (
                      <Text
                        style={{
                          color: active ? "#78350f" : "#64748b",
                          fontFamily: fonts.body,
                          fontSize: 12,
                          lineHeight: 16,
                        }}
                        numberOfLines={3}
                      >
                        {tip}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function CreateStaffModal({
  open,
  onClose,
  roles,
  createRole,
  onChangeRole,
  createPhone,
  onChangePhone,
  createPin,
  onChangePin,
  createName,
  onChangeName,
  createEmail,
  onChangeEmail,
  saving,
  fieldStyle,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  roles: OfficeRoleOption[]
  createRole: string
  onChangeRole: (value: string) => void
  createPhone: string
  onChangePhone: (value: string) => void
  createPin: string
  onChangePin: (value: string) => void
  createName: string
  onChangeName: (value: string) => void
  createEmail: string
  onChangeEmail: (value: string) => void
  saving: boolean
  fieldStyle: {
    backgroundColor: string
    borderWidth: number
    borderColor: string
    borderRadius: number
    paddingHorizontal: number
    paddingVertical: number
    fontFamily: string
    fontSize: number
    color: string
  }
  onSubmit: () => void
}) {
  const insets = useSafeAreaInsets();
  const sheetHeight = Math.round(Dimensions.get("window").height * 0.86);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(15, 23, 42, 0.45)", justifyContent: "flex-end" }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close create"
          onPress={onClose}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
        />
        <View
          style={{
            height: sheetHeight,
            backgroundColor: ops.sheet,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingTop: 14,
            paddingBottom: Math.max(insets.bottom, 16),
          }}
        >
          <View style={{
            paddingHorizontal: 16,
            paddingBottom: 10,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: ops.ink, fontFamily: fonts.display, fontSize: 18, fontWeight: "600" }}>
                Create staff
              </Text>
              <Text style={{ color: "#64748b", fontFamily: fonts.body, fontSize: 13, lineHeight: 18 }}>
                Phone + PIN for society roles. Email is optional.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              hitSlop={8}
              style={{
                minWidth: 64,
                minHeight: 36,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: ops.line,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 12,
                backgroundColor: ops.page,
              }}
            >
              <Text style={{ color: ops.ink, fontFamily: fonts.display, fontSize: 13, fontWeight: "600" }}>
                Close
              </Text>
            </Pressable>
          </View>
          <ScrollView
            style={{ flex: 1, paddingHorizontal: 16 }}
            contentContainerStyle={{ gap: 10, paddingBottom: 12 }}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            <RolePicker
              label="Type"
              options={roles}
              value={createRole}
              onChange={onChangeRole}
            />
            <TextInput
              value={createPhone}
              onChangeText={onChangePhone}
              keyboardType="phone-pad"
              placeholder="Phone"
              placeholderTextColor="#94a3b8"
              style={fieldStyle}
            />
            <TextInput
              value={createPin}
              onChangeText={onChangePin}
              keyboardType="number-pad"
              secureTextEntry
              placeholder="PIN (4–6 digits)"
              placeholderTextColor="#94a3b8"
              maxLength={6}
              style={fieldStyle}
            />
            <TextInput
              value={createName}
              onChangeText={onChangeName}
              placeholder="Name (optional)"
              placeholderTextColor="#94a3b8"
              style={fieldStyle}
            />
            <TextInput
              value={createEmail}
              onChangeText={onChangeEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Email (optional)"
              placeholderTextColor="#94a3b8"
              style={fieldStyle}
            />
          </ScrollView>
          <View style={{ paddingHorizontal: 16, paddingTop: 10, gap: 8 }}>
            <AdminButton
              label={saving ? "Creating…" : `Create ${roleLabel(createRole, roles)}`}
              disabled={saving || !createPhone.trim() || createPin.replace(/\D/g, "").length < 4}
              onPress={onSubmit}
            />
            <AdminButton label="Cancel" secondary onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function PeopleRolesHelpModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const insets = useSafeAreaInsets();
  const sheetHeight = Math.round(Dimensions.get("window").height * 0.82);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(15, 23, 42, 0.45)", justifyContent: "flex-end" }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close help"
          onPress={onClose}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
        />
        <View
          style={{
            height: sheetHeight,
            backgroundColor: ops.sheet,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingTop: 14,
            paddingBottom: Math.max(insets.bottom, 16),
          }}
        >
          <View style={{ paddingHorizontal: 16, paddingBottom: 10, gap: 4 }}>
            <Text style={{ color: ops.ink, fontFamily: fonts.display, fontSize: 18, fontWeight: "600" }}>
              Who does what
            </Text>
            <Text style={{ color: "#64748b", fontFamily: fonts.body, fontSize: 13, lineHeight: 18 }}>
              Use Create for the building team (phone and PIN). People who live in a home are added under Flats.
            </Text>
          </View>
          <ScrollView
            style={{ flex: 1, paddingHorizontal: 16 }}
            contentContainerStyle={{ gap: 10, paddingBottom: 12 }}
            showsVerticalScrollIndicator
            bounces
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {PEOPLE_ROLE_GUIDE.map((item) => (
              <View
                key={item.title}
                style={{
                  borderWidth: 1,
                  borderColor: ops.line,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  gap: 4,
                  backgroundColor: ops.page,
                }}
              >
                <Text style={{ color: ops.ink, fontFamily: fonts.display, fontSize: 14, fontWeight: "600" }}>
                  {item.title}
                </Text>
                <Text style={{ color: "#92400e", fontFamily: fonts.body, fontSize: 11, lineHeight: 15 }}>
                  Works with: {item.reportsTo}
                </Text>
                <Text style={{ color: "#475569", fontFamily: fonts.body, fontSize: 12, lineHeight: 16 }}>
                  {item.tasks}
                </Text>
              </View>
            ))}
          </ScrollView>
          <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
            <AdminButton label="Close" secondary onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
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
  const [helpOpen, setHelpOpen] = useState(false);
  const [createPhone, setCreatePhone] = useState("");
  const [createPin, setCreatePin] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createName, setCreateName] = useState("");
  const [createRole, setCreateRole] = useState("security");
  const [editPin, setEditPin] = useState("");
  const [editEmail, setEditEmail] = useState("");
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
      if (selected.phone) {
        const pinDigits = editPin.replace(/\D/g, "");
        if (pinDigits && pinDigits.length < 4) {
          throw new Error("New PIN must be 4 to 6 digits, or leave blank.");
        }
        const result = await createOfficeUser({
          phone: selected.phone,
          pin: pinDigits,
          role,
          displayName,
          email: editEmail,
        });
        setTone("ok");
        setMessage(result.message || `${chosenLabel} updated.`);
      } else {
        const result = await assignOfficeRole({
          userId: selected.userId,
          role,
          displayName,
        });
        setTone("ok");
        setMessage(result.message || `${chosenLabel} assigned.`);
      }
      setSelectedId(null);
      setDisplayName("");
      setEditPin("");
      setEditEmail("");
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
      setEditPin("");
      setEditEmail("");
      return;
    }
    const current = officeRoleOf(person);
    setCreateOpen(false);
    setSelectedId(person.userId);
    setRole(current || roles[0]?.value || "facility");
    setDisplayName(person.name);
    setEditPin("");
    setEditEmail(person.email || "");
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <AdminButton
            compact
            label="Create"
            onPress={() => setCreateOpen(true)}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Who does what"
            onPress={() => setHelpOpen(true)}
            hitSlop={6}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "rgba(248,250,252,0.35)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: ops.headerText, fontFamily: fonts.display, fontSize: 16, fontWeight: "700" }}>
              ?
            </Text>
          </Pressable>
        </View>
      )}
      toolbar={(
        <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
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
      )}
    >
      <PeopleRolesHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      <CreateStaffModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        roles={roles}
        createRole={createRole}
        onChangeRole={setCreateRole}
        createPhone={createPhone}
        onChangePhone={setCreatePhone}
        createPin={createPin}
        onChangePin={setCreatePin}
        createName={createName}
        onChangeName={setCreateName}
        createEmail={createEmail}
        onChangeEmail={setCreateEmail}
        saving={saving}
        fieldStyle={fieldStyle}
        onSubmit={() => { create().catch(() => undefined); }}
      />
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
                      {open ? "Close" : office ? "Edit" : "Assign"}
                    </Text>
                  </View>
                </Pressable>

                {open ? (
                  <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 10 }}>
                    <Text style={{ color: ops.ink, fontFamily: fonts.display, fontSize: 15, fontWeight: "600" }}>
                      {person.phone ? "Edit staff" : "Assign role"}
                    </Text>
                    {person.phone ? (
                      <Text style={{ color: "#64748b", fontFamily: fonts.body, fontSize: 13 }}>
                        Phone {person.phone} · leave PIN blank to keep the current one
                      </Text>
                    ) : null}
                    <RolePicker
                      label="Role"
                      options={roles}
                      value={role}
                      onChange={setRole}
                    />
                    <TextInput
                      value={displayName}
                      onChangeText={setDisplayName}
                      placeholder="Display name"
                      placeholderTextColor="#94a3b8"
                      style={fieldStyle}
                    />
                    {person.phone ? (
                      <>
                        <TextInput
                          value={editPin}
                          onChangeText={setEditPin}
                          keyboardType="number-pad"
                          secureTextEntry
                          placeholder="New PIN (optional)"
                          placeholderTextColor="#94a3b8"
                          maxLength={6}
                          style={fieldStyle}
                        />
                        <TextInput
                          value={editEmail}
                          onChangeText={setEditEmail}
                          autoCapitalize="none"
                          keyboardType="email-address"
                          placeholder="Email (optional)"
                          placeholderTextColor="#94a3b8"
                          style={fieldStyle}
                        />
                      </>
                    ) : null}
                    <AdminButton
                      label={
                        saving
                          ? "Saving…"
                          : person.phone
                            ? `Save ${chosenLabel}`
                            : alreadyAssigned
                              ? (sameRole ? `Keep ${chosenLabel}` : `Change to ${chosenLabel}`)
                              : `Assign ${chosenLabel}`
                      }
                      disabled={saving || (!person.phone && sameRole)}
                      onPress={() => { save().catch(() => undefined); }}
                    />
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
