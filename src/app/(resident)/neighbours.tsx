import { useCallback, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Note, Screen } from "@/components/Screen";
import { loadNeighbours, type NeighbourHome } from "@/lib/office";
import { colors, fonts, ui } from "@/theme";

export default function NeighboursScreen() {
  const router = useRouter();
  const [homes, setHomes] = useState<NeighbourHome[]>([]);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async (q: string) => {
    try {
      const data = await loadNeighbours(q);
      setHomes(data.homes);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load neighbours.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(""); }, [load]));

  function closeSearch() {
    setSearching(false);
    setQuery("");
    load("").catch(() => undefined);
  }

  return (
    <Screen
      title="Neighbours"
      busy={!ready && !message}
      onRefresh={() => load(query)}
      search={{
        open: searching,
        value: query,
        placeholder: "Flat or name",
        onOpen: () => setSearching(true),
        onClose: closeSearch,
        onChange: setQuery,
        onSubmit: () => { load(query).catch(() => undefined); },
      }}
    >
      <Text style={ui.body}>Open a home for owner, family, and tenant details. Connect first to call each other. Numbers stay masked until then.</Text>
      {ready && homes.length === 0 ? <Text style={ui.body}>No matching homes.</Text> : null}
      {homes.map((home) => (
        <Pressable
          key={home.home}
          onPress={() => router.push({
            pathname: "/(resident)/neighbour/[home]",
            params: {
              home: home.home,
              ...(home.flatId ? { flatId: String(home.flatId) } : {}),
            },
          })}
          style={[ui.card, { flexDirection: "row", gap: 12, alignItems: "center" }]}
        >
          {home.photo ? (
            <Image source={{ uri: home.photo }} style={{ width: 44, height: 44, borderRadius: 14 }} />
          ) : (
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: colors.gold, fontWeight: "600" }}>{home.owner.trim().charAt(0).toUpperCase() || "N"}</Text>
            </View>
          )}
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Text style={ui.label}>{home.home} · Floor {home.floor} · {home.type}</Text>
              <Text
                style={{
                  color: home.registered ? colors.gold : colors.muted,
                  fontFamily: fonts.display,
                  fontSize: 11,
                  fontWeight: "600",
                  backgroundColor: home.registered ? colors.brandSoft : "rgba(15, 23, 42, 0.06)",
                  overflow: "hidden",
                  borderRadius: 999,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}
              >
                {home.registered ? "Verified ✓" : "Not verified ?"}
              </Text>
            </View>
            <Text style={ui.cardTitle}>{home.owner}</Text>
            {home.tenant ? <Text style={ui.body}>Tenant · {home.tenant}</Text> : null}
            {home.mine ? <Text style={ui.meta}>Your home</Text> : null}
          </View>
        </Pressable>
      ))}
      {message ? <Note text={message} /> : null}
    </Screen>
  );
}
