import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Note, Screen } from "@/components/Screen";
import { loadBrochureProject } from "@/lib/brochure";
import { ui } from "@/theme";

export default function PublicAmenitiesScreen() {
  const [amenities, setAmenities] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const project = await loadBrochureProject();
      setAmenities(project.amenities);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load amenities.");
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen title="Features" showBack={false} onRefresh={load} busy={!amenities.length && !message}>
      <Text style={ui.body}>Public amenities and features of the apartment.</Text>
      <View style={ui.card}>
        {amenities.map((item) => (
          <Text key={item} style={[ui.body, { marginBottom: 8 }]}>
            {item}
          </Text>
        ))}
      </View>
      {message ? <Note text={message} /> : null}
    </Screen>
  );
}
