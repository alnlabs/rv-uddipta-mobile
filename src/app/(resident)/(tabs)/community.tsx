import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { HubCard, SectionLabel } from "@/components/Blocks";
import { IconButton, Note, Screen } from "@/components/Screen";
import { loadFeatures, featureOn } from "@/lib/features";
import { ui } from "@/theme";

export default function CommunityScreen() {
  const router = useRouter();
  const [features, setFeatures] = useState<string[] | null>(null);
  const [ready, setReady] = useState(false);

  useFocusEffect(useCallback(() => {
    loadFeatures()
      .then((enabled) => setFeatures(enabled))
      .catch(() => setFeatures(null))
      .finally(() => setReady(true));
  }, []));

  return (
    <Screen
      title="Community"
      showBack={false}
      busy={!ready}
      action={(
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <IconButton
            icon="settings"
            label="Settings"
            onPress={() => router.push("/(resident)/settings")}
          />
          <IconButton
            icon="user"
            label="Profile"
            onPress={() => router.push("/(resident)/profile")}
          />
        </View>
      )}
    >
      <Text style={ui.body}>Neighbours, events, and society tools. The feed has its own tab.</Text>
      {ready && !features ? <Note text="Could not check which features are open." /> : null}

      <SectionLabel title="People" />
      <View style={{ flexDirection: "row", gap: 12 }}>
        {(!ready || featureOn(features, "neighbours")) ? (
          <HubCard icon="people" title="Neighbours" detail="Find a flat or a name" onPress={() => router.push("/(resident)/neighbours")} />
        ) : null}
      </View>

      <SectionLabel title="Together" />
      <View style={{ flexDirection: "row", gap: 12 }}>
        {(!ready || featureOn(features, "events")) ? (
          <HubCard icon="schedule" title="Events" detail="Dates and who is going" onPress={() => router.push("/(resident)/events")} />
        ) : null}
        {(!ready || featureOn(features, "polls")) ? (
          <HubCard icon="poll" title="Polls" detail="Choices and results" onPress={() => router.push("/(resident)/polls")} />
        ) : null}
      </View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        {(!ready || featureOn(features, "forms")) ? (
          <HubCard icon="form" title="Enquiries" detail="One answer per home" onPress={() => router.push("/(resident)/forms")} />
        ) : null}
        {(!ready || featureOn(features, "announcements")) ? (
          <HubCard icon="bell" title="Notices" detail="From the office" onPress={() => router.push("/(resident)/notices")} />
        ) : null}
      </View>
    </Screen>
  );
}
