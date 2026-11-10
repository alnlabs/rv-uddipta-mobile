import { useCallback, useState } from "react";
import { Image, Linking, Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Panel, SectionLabel } from "@/components/Blocks";
import { MenuRow, Note, Screen, SignOut } from "@/components/Screen";
import { loadAccount } from "@/lib/community";
import { loadFeatures, featureOn } from "@/lib/features";
import { loadNeighbour, type NeighbourHome } from "@/lib/office";
import { type Account } from "@/lib/place";
import { siteUrl } from "@/lib/site";
import { supabase } from "@/lib/supabase";
import { colors, ui } from "@/theme";

function typeLabel(type: string) {
  if (type === "2BHK") return "2 BHK";
  if (type === "3BHK") return "3 BHK";
  return type || "—";
}

function facingLabel(facing: string) {
  if (facing === "E") return "East";
  if (facing === "W") return "West";
  return facing || "—";
}

function occupancyLabel(value?: string) {
  if (value === "rented") return "Rented";
  if (value === "owner_stay") return "Owner stay";
  return value || "—";
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

export default function ProfileScreen() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [email, setEmail] = useState("");
  const [home, setHome] = useState<NeighbourHome | null>(null);
  const [features, setFeatures] = useState<string[] | null>(null);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      const [person, enabled, session] = await Promise.all([
        loadAccount(),
        loadFeatures().catch(() => null),
        supabase.auth.getUser(),
      ]);
      setAccount(person);
      setEmail(session.data.user?.email?.trim() || "");
      setFeatures(enabled);

      if (person.flatNumber && !person.superAdmin) {
        const detail = await loadNeighbour(person.flatNumber).catch(() => null);
        setHome(detail?.home ?? null);
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
  const isAdmin = !superAdmin && account?.role === "admin";
  const showCommittee = !superAdmin && (isAdmin || account?.role === "committee");
  const family = home?.family ?? [];
  const renters = home?.renters ?? [];
  const people = home?.people ?? [];

  return (
    <Screen title="Profile" onRefresh={load} busy={!ready && !message}>
      {account ? (
        <>
          <Panel>
            <Text style={ui.label}>Personal</Text>
            <Text style={ui.cardTitle}>{account.name || "Resident"}</Text>
            {email ? <Text style={ui.body}>{email}</Text> : null}
            <Text style={ui.meta}>{account.roleLabel}</Text>
            {account.home ? <Note text={account.home} /> : null}
            {superAdmin ? (
              <Note text="Super admin has its own screens — not the resident home." />
            ) : null}
            {!superAdmin && account.needsClaim ? (
              <Pressable onPress={() => router.push("/(resident)/claim")} style={ui.button}>
                <Text style={ui.buttonText}>Claim my flat</Text>
              </Pressable>
            ) : null}
          </Panel>

          {!superAdmin && (account.flatNumber || home) ? (
            <Panel>
              <Text style={ui.label}>Flat</Text>
              <Text style={ui.cardTitle}>{home?.home || account.flatNumber || "—"}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 8 }}>
                <Fact label="Wing" value={home?.wing || account.wing || "—"} />
                <Fact label="Floor" value={home?.floor ? String(home.floor) : "—"} />
                <Fact label="Type" value={typeLabel(home?.type || "")} />
                <Fact label="Facing" value={facingLabel(home?.facing || "")} />
                <Fact label="Area" value={home?.area ? `${home.area.toLocaleString()} sft` : "—"} />
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
                <Text style={ui.label}>Family</Text>
                {family.length ? (
                  <View style={{ gap: 10 }}>
                    {family.map((person) => (
                      <PersonRow key={person.name} name={person.name} photo={person.photoUrl} />
                    ))}
                  </View>
                ) : (
                  <Text style={ui.body}>No family listed.</Text>
                )}
              </Panel>

              <Panel>
                <Text style={ui.label}>Tenants</Text>
                {home.tenant || renters.length ? (
                  <View style={{ gap: 10 }}>
                    {home.tenant ? (
                      <PersonRow name={home.tenant} detail={home.tenantPhone || undefined} />
                    ) : null}
                    {renters
                      .filter((person) => person.name !== home.tenant)
                      .map((person) => (
                        <PersonRow
                          key={`${person.name}-${person.startDate || ""}`}
                          name={person.name}
                          detail={[person.current ? "Living here" : null, person.phone || null].filter(Boolean).join(" · ") || undefined}
                        />
                      ))}
                  </View>
                ) : (
                  <Text style={ui.body}>No tenant listed.</Text>
                )}
              </Panel>

              {people.length ? (
                <Panel>
                  <Text style={ui.label}>On the app</Text>
                  <View style={{ gap: 10 }}>
                    {people.map((person) => (
                      <PersonRow key={`${person.name}-${person.role || ""}`} name={person.name} detail={person.role} />
                    ))}
                  </View>
                </Panel>
              ) : null}
            </>
          ) : null}

          {superAdmin ? (
            <>
              <SectionLabel title="Platform" />
              <MenuRow
                icon="admin"
                title="Super admin"
                detail="Office roles and apartment overview"
                onPress={() => router.push("/(super)")}
              />
            </>
          ) : null}

          <SectionLabel title="Account" />
          {!superAdmin ? (
            <Text style={ui.body}>Alerts stay in Inbox. Tap a push notification to open the right screen.</Text>
          ) : null}
          {!features ? <Note text="Could not check which features are open." /> : null}
          {showCommittee && featureOn(features, "committee") ? (
            <MenuRow icon="admin" title="Committee" detail="Open decisions" onPress={() => router.push("/(resident)/committee")} />
          ) : null}
          {!superAdmin ? (
            <MenuRow
              icon="model"
              title="Floor plans"
              detail="Opens the existing plans on the website. They are not redrawn here."
              onPress={() => { Linking.openURL(`${siteUrl}/community?view=3d`).catch(() => undefined); }}
            />
          ) : null}
          {message ? <Note text={message} /> : null}
          <SignOut />
        </>
      ) : null}

      {ready && !account && message ? <Note text={message} /> : null}
    </Screen>
  );
}
