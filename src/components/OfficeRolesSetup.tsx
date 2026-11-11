import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { AdminBanner, AdminButton, ops } from "@/components/AdminUi";
import { LoadingOverlay } from "@/components/Screen";
import {
  loadRolesDesk,
  setOfficeRolesEnabled,
  type OfficeRoleOption,
} from "@/lib/rolesDesk";
import { fonts } from "@/theme";

/** Super admin: choose which outside/office roles this society uses. */
export function OfficeRolesSetup() {
  const [catalog, setCatalog] = useState<OfficeRoleOption[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"error" | "ok">("error");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const desk = await loadRolesDesk();
      if (!desk.canAssignAdmin) {
        setReady(true);
        return;
      }
      setCatalog(desk.catalog.length ? desk.catalog : desk.roles);
      setPicked(desk.enabledRoles.length ? desk.enabledRoles : desk.roles.map((item) => item.value));
      setMessage("");
    } catch (error) {
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Could not load role setup.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function toggle(value: string) {
    if (value === "admin") return;
    setPicked((current) => (
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    ));
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const next = picked.includes("admin") ? picked : ["admin", ...picked];
      const result = await setOfficeRolesEnabled(next);
      setPicked(Array.isArray(result.roles) ? result.roles.map(String) : next);
      setTone("ok");
      setMessage("Society roles saved. Admins will only see these when assigning people.");
    } catch (error) {
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  if (ready && !catalog.length) return null;

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 12, backgroundColor: ops.sheet, borderRadius: 12, borderWidth: 1, borderColor: ops.line, padding: 14, gap: 12, overflow: "hidden" }}>
      <Text style={{ color: ops.ink, fontFamily: fonts.display, fontSize: 15, fontWeight: "600" }}>
        Roles this society uses
      </Text>
      <Text style={{ color: "#64748b", fontFamily: fonts.body, fontSize: 13, lineHeight: 18 }}>
        Turn on Security, Facility, Staff, and other society role types. Admins can create staff into these roles.
      </Text>
      {message ? <AdminBanner text={message} tone={tone} /> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, minHeight: 44 }}>
        {(catalog.length ? catalog : [
          { value: "admin", label: "Admin" },
          { value: "facility", label: "Facility" },
          { value: "security", label: "Security" },
        ]).map((item) => {
          const on = picked.includes(item.value);
          const locked = item.value === "admin";
          return (
            <Pressable
              key={item.value}
              disabled={locked || !ready}
              onPress={() => toggle(item.value)}
              style={{
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                backgroundColor: on ? ops.header : ops.page,
                borderWidth: 1,
                borderColor: on ? ops.header : ops.line,
                opacity: locked ? 0.85 : 1,
              }}
            >
              <Text style={{ color: on ? ops.headerText : ops.ink, fontFamily: fonts.display, fontSize: 13, fontWeight: "600" }}>
                {item.value === "facility" ? "Facility" : item.label}
                {locked ? " · always" : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <AdminButton
        label={saving ? "Saving…" : "Save roles"}
        disabled={saving || !ready}
        onPress={() => { save().catch(() => undefined); }}
      />
      {!ready ? <LoadingOverlay light /> : null}
    </View>
  );
}
