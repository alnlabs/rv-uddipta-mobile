import { useCallback, useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Banner, Panel } from "@/components/Blocks";
import { CallButton } from "@/components/CallButton";
import { Note, Screen } from "@/components/Screen";
import { loadAccount } from "@/lib/community";
import { connectNeighbour, loadNeighbour, type NeighbourHome } from "@/lib/office";
import { colors, ui } from "@/theme";

function PersonRow({ name, detail, photo }: { name: string; detail?: string; photo?: string | null }) {
  return (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
      {photo ? (
        <Image source={{ uri: photo }} style={{ width: 40, height: 40, borderRadius: 14 }} />
      ) : (
        <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.gold, fontWeight: "600" }}>{name.trim().charAt(0).toUpperCase() || "N"}</Text>
        </View>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={ui.body}>{name}</Text>
        {detail ? <Text style={ui.meta}>{detail}</Text> : null}
      </View>
    </View>
  );
}

export default function NeighbourDetailScreen() {
  const { home: raw, flatId: flatIdRaw } = useLocalSearchParams<{ home: string; flatId?: string }>();
  const homeKey = decodeURIComponent(String(Array.isArray(raw) ? raw[0] : raw || "").trim());
  const flatId = Number(Array.isArray(flatIdRaw) ? flatIdRaw[0] : flatIdRaw || 0) || undefined;
  const [home, setHome] = useState<NeighbourHome | null>(null);
  const [incoming, setIncoming] = useState(false);
  const [role, setRole] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"error" | "ok">("error");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!homeKey && !flatId) {
      setHome(null);
      setMessage("Choose a home from the directory.");
      setTone("error");
      setReady(true);
      return;
    }
    try {
      const [data, account] = await Promise.all([
        loadNeighbour(homeKey, flatId),
        loadAccount().catch(() => null),
      ]);
      setHome(data.home);
      setIncoming(Boolean(data.incoming));
      setRole(account?.role || "");
      setMessage("");
    } catch (error) {
      setHome(null);
      setMessage(error instanceof Error ? error.message : "Could not load that home.");
      setTone("error");
    } finally {
      setReady(true);
    }
  }, [homeKey, flatId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function act(action: "connect" | "accept" | "refuse") {
    if (!home || saving) return;
    setSaving(true);
    setMessage("");
    try {
      const result = await connectNeighbour({
        home: home.home,
        note,
        action,
        requestId: home.requestId || undefined,
      });
      setTone("ok");
      setMessage(result.message);
      setNote("");
      await load();
    } catch (error) {
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Could not update that.");
    } finally {
      setSaving(false);
    }
  }

  const meta = home
    ? [
        home.wing ? `Wing ${home.wing}` : null,
        home.floor ? `Floor ${home.floor}` : null,
        home.type || null,
        home.facing || null,
        home.area ? `${home.area.toLocaleString()} sft` : null,
      ].filter(Boolean).join(" · ")
    : "";

  const security = role === "security";
  const canCall = Boolean(home?.canCall) || home?.connection === "accepted" || role === "admin" || security;
  const showNumber = canCall && !security;

  return (
    <Screen title={home?.home || "Neighbour"} onRefresh={load} busy={!ready && !message}>
      <Text style={ui.body}>
        {home?.registered
          ? "Verified home — linked on the app. Call only after you are connected (admins and security can always call)."
          : "Not verified yet. Full family and contact details open after this home registers and links."}
      </Text>
      {message ? <Banner text={message} tone={tone} /> : null}
      {home ? (
        <>
          <Panel>
            <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              {home.photo ? (
                <Image source={{ uri: home.photo }} style={{ width: 64, height: 64, borderRadius: 18 }} />
              ) : (
                <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: colors.gold, fontSize: 22, fontWeight: "600" }}>{home.owner.trim().charAt(0).toUpperCase() || "N"}</Text>
                </View>
              )}
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={ui.label}>{home.home}</Text>
                <Text style={ui.cardTitle}>{home.owner}</Text>
                {meta ? <Text style={ui.meta}>{meta}</Text> : null}
                {home.occupancy ? <Text style={ui.meta}>{home.occupancy}</Text> : null}
                <Text style={[ui.meta, { color: home.registered ? colors.gold : colors.muted, fontWeight: "600" }]}>
                  {home.registered ? "Verified ✓" : "Not verified ?"}
                </Text>
              </View>
            </View>
            {home.registered ? (
              <>
                {showNumber && home.phone ? <Text style={ui.body}>{home.phone}</Text> : null}
                {home.email ? <Text style={ui.body}>{home.email}</Text> : null}
                {canCall && !home.mine ? (
                  <View style={{ marginTop: 8, gap: 8 }}>
                    <CallButton
                      home={home.home}
                      which="owner"
                      label="Call owner"
                      showNumber={false}
                    />
                    {home.tenant || home.tenantPhone ? (
                      <CallButton
                        home={home.home}
                        which="tenant"
                        label="Call tenant"
                        showNumber={showNumber}
                        masked={home.tenantPhone || undefined}
                      />
                    ) : null}
                  </View>
                ) : null}
              </>
            ) : (
              <Text style={ui.body}>Owner name and flat only until this home is verified.</Text>
            )}
          </Panel>

          {home.registered ? (
            <>
              <Panel>
                <Text style={ui.label}>Family</Text>
                {(home.family ?? []).length ? (
                  <View style={{ gap: 10 }}>
                    {(home.family ?? []).map((person) => (
                      <PersonRow key={person.name} name={person.name} photo={person.photoUrl} />
                    ))}
                  </View>
                ) : (
                  <Text style={ui.body}>No family listed.</Text>
                )}
              </Panel>

              <Panel>
                <Text style={ui.label}>Tenant</Text>
                {home.tenant || (home.renters ?? []).length ? (
                  <View style={{ gap: 10 }}>
                    {home.tenant ? (
                      <PersonRow
                        name={home.tenant}
                        detail={showNumber ? (home.tenantPhone || undefined) : undefined}
                      />
                    ) : null}
                    {(home.renters ?? [])
                      .filter((person) => person.name !== home.tenant)
                      .map((person) => (
                        <PersonRow
                          key={`${person.name}-${person.startDate || ""}`}
                          name={person.name}
                          detail={[person.current ? "Living here" : null, showNumber ? person.phone || null : null].filter(Boolean).join(" · ") || undefined}
                        />
                      ))}
                  </View>
                ) : (
                  <Text style={ui.body}>No tenant.</Text>
                )}
              </Panel>

              {(home.people ?? []).length ? (
                <Panel>
                  <Text style={ui.label}>On the app</Text>
                  <View style={{ gap: 10 }}>
                    {(home.people ?? []).map((person) => (
                      <PersonRow key={`${person.name}-${person.role || ""}`} name={person.name} detail={person.role} />
                    ))}
                  </View>
                </Panel>
              ) : null}
            </>
          ) : null}

          {home.mine ? (
            <Note text="This is your home." />
          ) : home.connection === "accepted" ? (
            <Banner text="You are connected with this home. You can call them." tone="ok" />
          ) : home.connection === "pending" && incoming ? (
            <Panel>
              <Text style={ui.cardTitle}>They asked to connect</Text>
              <Pressable disabled={saving} onPress={() => act("accept")} style={ui.button}>
                <Text style={ui.buttonText}>{saving ? "Saving…" : "Accept"}</Text>
              </Pressable>
              <Pressable disabled={saving} onPress={() => act("refuse")} style={[ui.button, { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.button }]}>
                <Text style={[ui.buttonText, { color: colors.button }]}>Decline</Text>
              </Pressable>
            </Panel>
          ) : home.connection === "pending" ? (
            <Banner text="Your connect request is waiting." tone="ok" />
          ) : role === "admin" || security ? null : (
            <Panel>
              <Text style={ui.label}>Connect</Text>
              <Text style={ui.body}>Send a short introduction. After they accept, you can call each other.</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Optional note"
                placeholderTextColor={colors.placeholder}
                style={[ui.field, { backgroundColor: colors.page, borderWidth: 0 }]}
              />
              <Pressable disabled={saving} onPress={() => act("connect")} style={ui.button}>
                <Text style={ui.buttonText}>{saving ? "Sending…" : "Connect"}</Text>
              </Pressable>
            </Panel>
          )}
        </>
      ) : null}
      {ready && !home && !message ? <Text style={ui.body}>That home is not in the directory.</Text> : null}
    </Screen>
  );
}
