import { useCallback, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { AdminBanner, AdminButton, AdminEmpty, ops } from "@/components/AdminUi";
import { Chips } from "@/components/Blocks";
import { Loading } from "@/components/Screen";
import { t, tFill } from "@/lib/labelDefaults";
import {
  flushDueReminders,
  loadSocietyAreas,
  loadSocietyCatalog,
  saveSocietyArea,
  saveSocietyReminder,
  saveSocietyRole,
  saveSocietyTask,
  setPersonExtraTasks,
  setRoleTasks,
  type SocietyArea,
  type SocietyCatalog,
  type SocietyRoleRow,
  type SocietyWork,
} from "@/lib/societyCatalog";
import { fonts } from "@/theme";

type Tab = "work" | "roles" | "areas" | "reminders";

const AREA_OWNER_OPTIONS = [
  { value: "builder", label: "Builder" },
  { value: "facility", label: "Facility" },
  { value: "staff", label: "Staff" },
  { value: "security", label: "Security" },
  { value: "committee", label: "Committee" },
  { value: "admin", label: "Admin" },
];

export function SocietyCatalogPanels({
  tab,
  personUserId,
  onLabels,
}: {
  tab: Tab | "extra"
  personUserId?: string | null
  onLabels?: (labels: Record<string, string>) => void
}) {
  const [catalog, setCatalog] = useState<SocietyCatalog | null>(null);
  const [areas, setAreas] = useState<SocietyArea[]>([]);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"error" | "ok">("error");
  const [ready, setReady] = useState(false);
  const [label, setLabel] = useState("");
  const [summary, setSummary] = useState("");
  const [duration, setDuration] = useState<"regular" | "temporary">("regular");
  const [mapsTo, setMapsTo] = useState("staff");
  const [taskKey, setTaskKey] = useState("");
  const [editingRole, setEditingRole] = useState<SocietyRoleRow | null>(null);
  const [pickedTasks, setPickedTasks] = useState<string[]>([]);
  const [extraPicked, setExtraPicked] = useState<string[]>([]);
  const [areaDrafts, setAreaDrafts] = useState<Record<string, { ownerRole: string; summary: string }>>({});

  const labels = catalog?.labels || {};

  const load = useCallback(async () => {
    try {
      const [next, areaRows] = await Promise.all([
        loadSocietyCatalog(),
        tab === "areas" ? loadSocietyAreas().catch(() => []) : Promise.resolve([] as SocietyArea[]),
      ]);
      setCatalog(next);
      onLabels?.(next.labels);
      if (tab === "areas") {
        setAreas(areaRows);
        setAreaDrafts(
          Object.fromEntries(
            areaRows.map((area) => [
              area.areaKey,
              { ownerRole: area.ownerRole, summary: area.summary },
            ]),
          ),
        );
      }
      setMessage("");
      if (personUserId) {
        setExtraPicked(
          next.people_extra
            .filter((row) => row.user_id === personUserId)
            .map((row) => row.task_key),
        );
      }
    } catch (error) {
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Could not load.");
    } finally {
      setReady(true);
    }
  }, [personUserId, onLabels, tab]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const workOptions = useMemo(
    () => (catalog?.work || []).filter((item) => item.enabled),
    [catalog],
  );

  if (!ready || !catalog) {
    return <Loading label="Loading…" />;
  }

  async function wrap(run: () => Promise<void>, okMessage: string) {
    setMessage("");
    try {
      await run();
      setTone("ok");
      setMessage(okMessage);
      await load();
    } catch (error) {
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    }
  }

  if (tab === "extra" && personUserId) {
    return (
      <View style={{ gap: 12, marginTop: 12 }}>
        <Text style={{ color: ops.ink, fontFamily: fonts.display, fontSize: 16, fontWeight: "700" }}>
          {t(labels, "extra_duty")}
        </Text>
        <Text style={{ color: "#64748b", fontSize: 12 }}>{t(labels, "extra_duty_help")}</Text>
        {message ? <AdminBanner text={message} tone={tone} /> : null}
        {workOptions.map((item) => {
          const on = extraPicked.includes(item.key);
          return (
            <Pressable
              key={item.key}
              onPress={() => {
                setExtraPicked((prev) =>
                  on ? prev.filter((key) => key !== item.key) : [...prev, item.key],
                );
              }}
              style={{
                borderWidth: 1,
                borderColor: on ? ops.ink : ops.line,
                borderRadius: 8,
                padding: 12,
                backgroundColor: on ? "rgba(15,23,42,0.04)" : ops.page,
              }}
            >
              <Text style={{ color: ops.ink, fontFamily: fonts.body, fontWeight: "600" }}>{item.label}</Text>
            </Pressable>
          );
        })}
        <AdminButton
          label={t(labels, "save_extra_duty")}
          onPress={() => wrap(
            () => setPersonExtraTasks(personUserId, extraPicked),
            t(labels, "saved"),
          )}
        />
      </View>
    );
  }

  if (tab === "areas") {
    return (
      <View style={{ gap: 14 }}>
        <Text style={{ color: "#64748b", fontFamily: fonts.body, fontSize: 13 }}>{t(labels, "help_areas")}</Text>
        {message ? <AdminBanner text={message} tone={tone} /> : null}
        {areas.length === 0 ? <AdminEmpty title="No areas yet" /> : null}
        {areas.map((area) => {
          const draft = areaDrafts[area.areaKey] || {
            ownerRole: area.ownerRole,
            summary: area.summary,
          };
          const gateLocked = area.areaKey === "gate";
          return (
            <View
              key={area.areaKey}
              style={{
                borderWidth: 1,
                borderColor: ops.line,
                borderRadius: 10,
                padding: 12,
                gap: 8,
                backgroundColor: "#fff",
              }}
            >
              <Text style={{ color: ops.ink, fontFamily: fonts.display, fontWeight: "700" }}>{area.label}</Text>
              <Text style={{ color: "#64748b", fontSize: 12 }}>
                {t(labels, "current_owner")}:{" "}
                {AREA_OWNER_OPTIONS.find((item) => item.value === area.currentOwnerRole)?.label
                  || area.currentOwnerRole}
              </Text>
              <Text style={{ color: "#64748b", fontSize: 11, fontWeight: "600", textTransform: "uppercase" }}>
                {t(labels, "who_looks_after")}
              </Text>
              <Chips
                value={draft.ownerRole}
                onChange={(value) => {
                  if (gateLocked) return;
                  setAreaDrafts((prev) => ({
                    ...prev,
                    [area.areaKey]: { ...draft, ownerRole: value },
                  }));
                }}
                options={AREA_OWNER_OPTIONS}
              />
              <Field
                label={t(labels, "summary")}
                value={draft.summary}
                onChange={(value) => setAreaDrafts((prev) => ({
                  ...prev,
                  [area.areaKey]: { ...draft, summary: value },
                }))}
              />
              <AdminButton
                label={t(labels, "save")}
                onPress={() => wrap(async () => {
                  await saveSocietyArea({
                    areaKey: area.areaKey,
                    ownerRole: draft.ownerRole,
                    summary: draft.summary,
                    startsAt: area.startsAt,
                    endsAt: area.endsAt,
                  });
                }, t(labels, "saved"))}
              />
            </View>
          );
        })}
      </View>
    );
  }

  if (tab === "work") {
    return (
      <View style={{ gap: 14 }}>
        <Text style={{ color: "#64748b", fontFamily: fonts.body, fontSize: 13 }}>{t(labels, "help_work")}</Text>
        {message ? <AdminBanner text={message} tone={tone} /> : null}
        <Field label={t(labels, "name")} value={label} onChange={setLabel} />
        <Field label={t(labels, "summary")} value={summary} onChange={setSummary} />
        <Chips
          value={duration}
          onChange={(value) => setDuration(value as "regular" | "temporary")}
          options={[
            { value: "regular", label: t(labels, "regular_duty") },
            { value: "temporary", label: t(labels, "temporary_duty") },
          ]}
        />
        <AdminButton
          label={t(labels, "add_work")}
          onPress={() => wrap(async () => {
            if (!label.trim()) throw new Error("Give a name for this work.");
            await saveSocietyTask({ label: label.trim(), summary, duration });
            setLabel("");
            setSummary("");
          }, t(labels, "saved"))}
        />
        <WorkList items={catalog.work} labels={labels} />
      </View>
    );
  }

  if (tab === "roles") {
    return (
      <View style={{ gap: 14 }}>
        <Text style={{ color: "#64748b", fontFamily: fonts.body, fontSize: 13 }}>{t(labels, "help_roles")}</Text>
        {message ? <AdminBanner text={message} tone={tone} /> : null}
        <Field label={t(labels, "name")} value={label} onChange={setLabel} />
        <Field label={t(labels, "summary")} value={summary} onChange={setSummary} />
        <Text style={{ color: "#64748b", fontSize: 11, fontWeight: "600", textTransform: "uppercase" }}>
          {t(labels, "app_shell")}
        </Text>
        <Chips
          value={mapsTo}
          onChange={setMapsTo}
          options={[
            { value: "security", label: "Security" },
            { value: "facility", label: "Facility" },
            { value: "staff", label: "Staff" },
            { value: "committee", label: "Committee" },
            { value: "builder", label: "Builder" },
          ]}
        />
        <AdminButton
          label={t(labels, "add_role")}
          onPress={() => wrap(async () => {
            if (!label.trim()) throw new Error("Give a name for this role.");
            await saveSocietyRole({ label: label.trim(), summary, maps_to: mapsTo });
            setLabel("");
            setSummary("");
          }, t(labels, "saved"))}
        />
        {catalog.roles.map((role) => (
          <View
            key={role.id}
            style={{
              borderWidth: 1,
              borderColor: ops.line,
              borderRadius: 10,
              padding: 12,
              gap: 8,
              backgroundColor: "#fff",
            }}
          >
            <Text style={{ color: ops.ink, fontFamily: fonts.display, fontWeight: "700" }}>{role.label}</Text>
            <Text style={{ color: "#64748b", fontSize: 12 }}>
              {tFill(labels, "people_count", { count: role.people_count })} · {(role.task_keys || []).length} {t(labels, "duty").toLowerCase()}s
            </Text>
            <AdminButton
              label={t(labels, "change_duties")}
              secondary
              onPress={() => {
                setEditingRole(role);
                setPickedTasks([...(role.task_keys || [])]);
              }}
            />
            {editingRole?.id === role.id ? (
              <View style={{ gap: 8 }}>
                <Text style={{ color: ops.ink, fontWeight: "600" }}>{t(labels, "duties_of_role")}</Text>
                {workOptions.map((item) => {
                  const on = pickedTasks.includes(item.key);
                  return (
                    <Pressable
                      key={item.key}
                      onPress={() => {
                        setPickedTasks((prev) =>
                          on ? prev.filter((key) => key !== item.key) : [...prev, item.key],
                        );
                      }}
                      style={{
                        borderWidth: 1,
                        borderColor: on ? ops.ink : ops.line,
                        borderRadius: 8,
                        padding: 10,
                      }}
                    >
                      <Text style={{ color: ops.ink, fontWeight: "600" }}>{item.label}</Text>
                    </Pressable>
                  );
                })}
                <AdminButton
                  label={t(labels, "save_duties")}
                  onPress={() => wrap(async () => {
                    await setRoleTasks(role.key, pickedTasks);
                    setEditingRole(null);
                  }, t(labels, "saved"))}
                />
              </View>
            ) : null}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={{ gap: 14 }}>
      <Text style={{ color: "#64748b", fontFamily: fonts.body, fontSize: 13 }}>{t(labels, "help_reminders")}</Text>
      {message ? <AdminBanner text={message} tone={tone} /> : null}
      <AdminButton
        label={t(labels, "send_due_reminders")}
        onPress={() => {
          setMessage("");
          (async () => {
            try {
              const sent = await flushDueReminders();
              setTone("ok");
              setMessage(`${t(labels, "send_due_reminders")}: ${sent}`);
              await load();
            } catch (error) {
              setTone("error");
              setMessage(error instanceof Error ? error.message : "Could not send reminders.");
            }
          })().catch(() => undefined);
        }}
      />
      <Text style={{ color: ops.ink, fontFamily: fonts.display, fontWeight: "700" }}>
        {t(labels, "set_reminder")}
      </Text>
      <Chips
        value={taskKey || workOptions[0]?.key || ""}
        onChange={setTaskKey}
        options={workOptions.map((item) => ({ value: item.key, label: item.label }))}
      />
      <AdminButton
        label={t(labels, "add_reminder_daily")}
        onPress={() => wrap(async () => {
          const key = taskKey || workOptions[0]?.key;
          if (!key) throw new Error("Add work first.");
          await saveSocietyReminder({
            taskKey: key,
            anchor: "repeat",
            repeat: "daily",
            keepInformed: true,
          });
        }, t(labels, "reminder_saved"))}
      />
      {catalog.reminders.length ? (
        catalog.reminders.map((item) => (
          <View
            key={item.id}
            style={{
              borderWidth: 1,
              borderColor: ops.line,
              borderRadius: 10,
              padding: 12,
              backgroundColor: "#fff",
              gap: 6,
            }}
          >
            <Text style={{ color: ops.ink, fontWeight: "700" }}>{item.task_label}</Text>
            <Text style={{ color: "#64748b", fontSize: 12 }}>
              {item.anchor}
              {item.repeat !== "none" ? ` · ${t(labels, item.repeat)}` : ""}
              {item.keep_informed ? ` · ${t(labels, "keep_informed")}` : ""}
              {item.enabled ? "" : ` · ${t(labels, "off")}`}
            </Text>
            <AdminButton
              label={item.enabled ? t(labels, "turn_off") : t(labels, "turn_on")}
              secondary
              onPress={() => wrap(
                () => saveSocietyReminder({
                  id: item.id,
                  taskKey: item.task_key,
                  remindAt: item.remind_at,
                  anchor: item.anchor,
                  repeat: item.repeat,
                  keepInformed: item.keep_informed,
                  enabled: !item.enabled,
                  offsetMinutes: item.offset_minutes,
                }),
                t(labels, "saved"),
              )}
            />
          </View>
        ))
      ) : (
        <AdminEmpty title={t(labels, "no_reminders_yet")} detail={t(labels, "help_reminders")} />
      )}
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: "#64748b", fontFamily: fonts.display, fontSize: 11, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase" }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        style={{
          minHeight: 44,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: ops.line,
          backgroundColor: ops.page,
          paddingHorizontal: 12,
          color: ops.ink,
          fontFamily: fonts.body,
        }}
      />
    </View>
  );
}

function WorkList({
  items,
  labels,
}: {
  items: SocietyWork[]
  labels: Record<string, string>
}) {
  if (!items.length) {
    return <AdminEmpty title={t(labels, "no_work_yet")} detail={t(labels, "help_work")} />;
  }
  return (
    <View style={{ gap: 8 }}>
      {items.map((item) => (
        <View
          key={item.id}
          style={{
            borderWidth: 1,
            borderColor: ops.line,
            borderRadius: 10,
            padding: 12,
            backgroundColor: "#fff",
          }}
        >
          <Text style={{ color: ops.ink, fontWeight: "700" }}>{item.label}</Text>
          <Text style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
            {item.duration === "temporary" ? t(labels, "temporary_duty") : t(labels, "regular_duty")}
            {item.enabled ? "" : ` · ${t(labels, "off")}`}
            {item.active ? "" : ` · ${t(labels, "inactive")}`}
          </Text>
          {item.summary ? (
            <Text style={{ color: "#475569", fontSize: 13, marginTop: 4 }}>{item.summary}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}
