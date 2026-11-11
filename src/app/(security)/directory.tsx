import { useCallback, useState } from "react";
import { Image, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { CallButton } from "@/components/CallButton";
import { Note, Screen } from "@/components/Screen";
import { loadNeighbours, type NeighbourHome } from "@/lib/office";
import { colors, fonts, ui } from "@/theme";

export default function SecurityDirectoryScreen() {
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
      setMessage(error instanceof Error ? error.message : "Could not load the directory.");
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
      title="Call a home"
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
      <Text style={ui.body}>
        Call any home. Numbers stay hidden — your phone dials without showing the number here.
      </Text>
      {ready && homes.length === 0 ? <Text style={ui.body}>No matching homes.</Text> : null}
      {homes.map((home) => (
        <View key={home.home} style={[ui.card, { gap: 10 }]}>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            {home.photo ? (
              <Image source={{ uri: home.photo }} style={{ width: 44, height: 44, borderRadius: 14 }} />
            ) : (
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: colors.gold, fontWeight: "600" }}>{home.owner.trim().charAt(0).toUpperCase() || "N"}</Text>
              </View>
            )}
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 13, fontWeight: "600" }}>
                {home.home} · Floor {home.floor}
              </Text>
              <Text style={ui.cardTitle}>{home.owner}</Text>
              {home.tenant ? <Text style={ui.body}>Tenant · {home.tenant}</Text> : null}
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <View style={{ flexGrow: 1, minWidth: 120 }}>
              <CallButton home={home.home} which="owner" label="Call owner" showNumber={false} />
            </View>
            {home.tenant ? (
              <View style={{ flexGrow: 1, minWidth: 120 }}>
                <CallButton home={home.home} which="tenant" label="Call tenant" showNumber={false} />
              </View>
            ) : null}
          </View>
        </View>
      ))}
      {message ? <Note text={message} /> : null}
    </Screen>
  );
}
