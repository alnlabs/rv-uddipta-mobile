import { useCallback, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Panel, SectionLabel } from "@/components/Blocks";
import { Note, Screen, SignOut } from "@/components/Screen";
import { loadAccount, switchAccountRole } from "@/lib/community";
import {
  loadMyHome,
  relationLabel,
  type NeighbourHome,
  type NeighbourPerson,
} from "@/lib/office";
import { type Account } from "@/lib/place";
import { supabase } from "@/lib/supabase";
import { colors, fonts, ui } from "@/theme";

function typeLabel(type: string) {
  if (type === "2BHK") return "2 BHK";
  if (type === "3BHK") return "3 BHK";
  return type || "—";
}

function facingLabel(facing: string) {
  if (facing === "E") return "East";
  if (facing === "W") return "West";
  if (facing === "N") return "North";
  if (facing === "S") return "South";
  return facing || "—";
}

function occupancyLabel(value?: string) {
  if (value === "rented") return "Rented";
  if (value === "owner_stay") return "Owner stay";
  return value || "—";
}

function roleLabel(role?: string) {
  if (role === "owner") return "Owner";
  if (role === "co_owner") return "Family";
  if (role === "tenant") return "Tenant";
  if (role === "admin") return "Society admin";
  if (!role) return "";
  const spaced = role.replaceAll("_", " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function metaText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function personOnAppDetail(person: NeighbourPerson) {
  return roleLabel(person.role) || person.role || "On the app";
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ width: "47%", gap: 2 }}>
      <Text style={ui.meta}>{label}</Text>
      <Text style={ui.cardTitle}>{value}</Text>
    </View>
  );
}

function PersonRow({ name, detail, photo }: { name: string; detail?: string; photo?: string | null }) {
  return (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
      {photo ? (
        <Image source={{ uri: photo }} style={{ width: 40, height: 40, borderRadius: 14 }} />
      ) : (
        <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.gold, fontWeight: "600" }}>{name.trim().charAt(0).toUpperCase() || "R"}</Text>
        </View>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={ui.body}>{name}</Text>
        {detail ? <Text style={ui.meta}>{detail}</Text> : null}
      </View>
    </View>
  );
}

function heroMeta(home: NeighbourHome) {
  return [
    typeLabel(home.type),
    home.wing ? `Wing ${home.wing}` : null,
    home.floor ? `Floor ${home.floor}` : null,
    home.facing ? `${facingLabel(home.facing)} facing` : null,
    home.area ? `${home.area.toLocaleString("en-IN")} sq ft` : null,
  ].filter(Boolean).join(" · ");
}

export default function ProfileScreen() {
  const [account, setAccount] = useState<Account | null>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [home, setHome] = useState<NeighbourHome | null>(null);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [switching, setSwitching] = useState(false);

  const load = useCallback(async () => {
    try {
      const [person, session] = await Promise.all([
        loadAccount(),
        supabase.auth.getUser(),
      ]);
      const user = session.data.user;
      const meta = (user?.user_metadata || {}) as Record<string, unknown>;
      setAccount(person);
      setEmail(user?.email?.trim() || "");
      setPhone(metaText(meta.phone) || metaText(meta.phone_number));
      const avatar = metaText(meta.avatar_url) || metaText(meta.picture);
      setPhoto(avatar || null);

      if (person.hasFlat || person.flatNumber) {
        const detail = await loadMyHome(person.flatNumber).catch(() => null);
        setHome(detail);
      } else {
        setHome(null);
      }
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load your profile.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const superAdmin = Boolean(account?.superAdmin);
  const family = home?.family ?? [];
  const renters = home?.renters ?? [];
  const people = home?.people ?? [];
  const household: { key: string; name: string; detail: string; photo?: string | null }[] = [];
  if (home?.owner) {
    household.push({ key: "owner", name: home.owner, detail: "Owner", photo: home.photo || null });
  }
  for (const person of family) {
    household.push({
      key: `family-${person.name}`,
      name: person.name,
      detail: relationLabel(person.relation) || "Family",
      photo: person.photoUrl,
    });
  }
  if (home?.tenant) {
    household.push({
      key: "tenant",
      name: home.tenant,
      detail: home.tenantPhone ? `Tenant · ${home.tenantPhone}` : "Tenant",
    });
  }
  for (const person of renters) {
    if (person.name === home?.tenant) continue;
    household.push({
      key: `renter-${person.name}-${person.startDate || ""}`,
      name: person.name,
      detail: [person.current ? "Tenant" : "Former tenant", person.phone || null].filter(Boolean).join(" · "),
    });
  }

  return (
    <Screen title="Profile" onRefresh={load} busy={!ready && !message}>
      {account ? (
        <>
          <Panel>
            <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
              {photo || home?.photo ? (
                <Image
                  source={{ uri: photo || home?.photo || "" }}
                  style={{ width: 64, height: 64, borderRadius: 18 }}
                />
              ) : (
                <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: colors.gold, fontSize: 22, fontWeight: "700" }}>
                    {(account.name || "R").trim().charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={ui.label}>Personal</Text>
                <Text style={ui.cardTitle}>{account.name || "Resident"}</Text>
                <Text style={ui.meta}>{account.roleLabel}</Text>
              </View>
            </View>
            <View style={{ gap: 6, marginTop: 12 }}>
              {email ? <Text style={ui.body}>{email}</Text> : null}
              {phone ? <Text style={ui.body}>{phone}</Text> : null}
              {account.roles.length > 1 ? (
                <View style={{ gap: 8, marginTop: 4 }}>
                  <Text style={ui.meta}>Switch role</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {account.roles.map((item) => {
                      const active = account.role === item.role;
                      return (
                        <Pressable
                          key={item.role}
                          disabled={switching || active}
                          onPress={async () => {
                            if (switching || active) return;
                            setSwitching(true);
                            try {
                              await switchAccountRole(item.role);
                              await load();
                            } catch (error) {
                              setMessage(error instanceof Error ? error.message : "Could not switch role.");
                            } finally {
                              setSwitching(false);
                            }
                          }}
                          style={{
                            minHeight: 36,
                            paddingHorizontal: 12,
                            borderRadius: 999,
                            borderWidth: 1,
                            borderColor: active ? colors.button : colors.line,
                            backgroundColor: active ? colors.button : colors.white,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              color: active ? colors.onButton : colors.ink,
                              fontFamily: fonts.display,
                              fontSize: 13,
                              fontWeight: "600",
                            }}
                          >
                            {item.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}
              {account.home ? <Note text={account.home} /> : null}
            </View>
          </Panel>

          {!superAdmin && (account.hasFlat || account.flatNumber || home) ? (
            <Panel>
              <Text style={ui.label}>This home</Text>
              <Text style={[ui.cardTitle, { fontSize: 28, lineHeight: 34 }]}>
                {home?.home || account.flatNumber || "—"}
              </Text>
              {home ? (
                <Text style={[ui.body, { marginTop: 6 }]}>{heroMeta(home)}</Text>
              ) : null}
              {home?.owner ? (
                <Text style={[ui.meta, { marginTop: 4 }]}>
                  {home.owner} · {occupancyLabel(home.occupancy)}
                </Text>
              ) : null}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 12 }}>
                <Fact label="Wing" value={home?.wing || account.wing || "—"} />
                <Fact label="Floor" value={home?.floor ? String(home.floor) : "—"} />
                <Fact label="Type" value={typeLabel(home?.type || "")} />
                <Fact label="Facing" value={facingLabel(home?.facing || "")} />
                <Fact label="Area" value={home?.area ? `${home.area.toLocaleString("en-IN")} sq ft` : "—"} />
                <Fact label="Occupancy" value={occupancyLabel(home?.occupancy)} />
                <Fact label="Owner" value={home?.owner || "—"} />
                {home?.phone ? <Fact label="Phone" value={home.phone} /> : null}
                {home?.email ? <Fact label="Flat email" value={home.email} /> : null}
              </View>
            </Panel>
          ) : null}

          {!superAdmin && home ? (
            <>
              <Panel>
                <Text style={ui.label}>People in this home</Text>
                {household.length ? (
                  <View style={{ gap: 10, marginTop: 4 }}>
                    {household.map((person) => (
                      <PersonRow
                        key={person.key}
                        name={person.name}
                        detail={person.detail}
                        photo={person.photo}
                      />
                    ))}
                  </View>
                ) : (
                  <Text style={ui.body}>No household names listed yet.</Text>
                )}
              </Panel>

              {people.length ? (
                <Panel>
                  <Text style={ui.label}>On the app</Text>
                  <View style={{ gap: 10, marginTop: 4 }}>
                    {people.map((person) => (
                      <PersonRow
                        key={`${person.name}-${person.role || ""}`}
                        name={person.name}
                        detail={personOnAppDetail(person)}
                      />
                    ))}
                  </View>
                </Panel>
              ) : null}
            </>
          ) : null}

          {!superAdmin && !account.hasFlat && !account.flatNumber ? (
            <Note text="Link a flat to see your home, family, and occupancy details here." />
          ) : null}

          <SectionLabel title="Account" />
          <Text style={ui.body}>Alerts stay in Inbox. Home layout and shortcuts are under Settings on Community.</Text>
          {message ? <Note text={message} /> : null}
          <SignOut />
        </>
      ) : null}

      {ready && !account && message ? <Note text={message} /> : null}
    </Screen>
  );
}
