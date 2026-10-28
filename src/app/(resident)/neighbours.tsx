import { useCallback, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Back, Loading, Note, Screen } from "@/components/Screen";
import { loadNeighbours } from "@/lib/office";
import { colors, ui } from "@/theme";

export default function NeighboursScreen() {
  const [homes, setHomes] = useState<Awaited<ReturnType<typeof loadNeighbours>>["homes"]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async (q = query) => {
    try {
      const data = await loadNeighbours(q);
      setHomes(data.homes);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load neighbours.");
    } finally {
      setReady(true);
    }
  }, [query]);

  useFocusEffect(useCallback(() => { load(""); }, [load]));

  return (
    <Screen onRefresh={() => load(query)}>
      <Back />
      <Text style={ui.eyebrow}>Community</Text>
      <Text style={ui.title}>Neighbours</Text>
      <Text style={ui.body}>Find a flat or a name. Phone numbers stay masked.</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={() => load(query)}
        placeholder="Search flat or name"
        placeholderTextColor={colors.placeholder}
        style={ui.field}
        returnKeyType="search"
      />
      <Pressable onPress={() => load(query)} style={ui.button}>
        <Text style={ui.buttonText}>Search</Text>
      </Pressable>
      {!ready ? <Loading /> : null}
      {ready && homes.length === 0 ? <Text style={ui.body}>No matching homes.</Text> : null}
      {homes.map((home) => (
        <View key={home.home} style={ui.card}>
          <Text style={ui.label}>{home.home} · Floor {home.floor} · {home.type}</Text>
          <Text style={ui.cardTitle}>{home.owner}</Text>
          {home.phone ? <Text style={ui.body}>{home.phone}</Text> : null}
          {home.tenant ? <Text style={ui.body}>Tenant · {home.tenant}{home.tenantPhone ? ` · ${home.tenantPhone}` : ""}</Text> : null}
        </View>
      ))}
      {message ? <Note text={message} /> : null}
    </Screen>
  );
}
