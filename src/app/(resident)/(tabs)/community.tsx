import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { HubCard } from "@/components/Blocks";
import { Note, Screen } from "@/components/Screen";
import { loadFeatures, featureOn } from "@/lib/features";
import { ui } from "@/theme";

export default function CommunityScreen() {
  const router = useRouter();
  const [features, setFeatures] = useState<string[] | null>(null);
  const [ready, setReady] = useState(false);

  useFocusEffect(useCallback(() => {
    loadFeatures()
      .then(setFeatures)
      .catch(() => setFeatures(null))
      .finally(() => setReady(true));
  }, []));

  return (
    <Screen underHeader>
      <Text style={ui.heading}>Community</Text>
      <Text style={ui.body}>Posts from neighbours sit apart from official notices.</Text>
      {ready && !features ? <Note text="Could not check which desks are open." /> : null}
      {featureOn(features, "feed") ? (
        <HubCard
          wide
          icon="feed"
          title="Feed"
          detail="Updates, questions, and photos from homes"
          onPress={() => router.push("/(resident)/feed")}
        />
      ) : null}
      <View style={{ flexDirection: "row", gap: 12 }}>
        {featureOn(features, "events") ? (
          <HubCard icon="schedule" title="Events" detail="Dates and who is going" onPress={() => router.push("/(resident)/events")} />
        ) : null}
        {featureOn(features, "polls") ? (
          <HubCard icon="poll" title="Polls" detail="Choices and results" onPress={() => router.push("/(resident)/polls")} />
        ) : null}
      </View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        {featureOn(features, "forms") ? (
          <HubCard icon="form" title="Forms" detail="One answer per home" onPress={() => router.push("/(resident)/forms")} />
        ) : null}
        {featureOn(features, "announcements") ? (
          <HubCard office icon="bell" title="Notices" detail="From the office" onPress={() => router.push("/(resident)/notices")} />
        ) : null}
      </View>
      {featureOn(features, "neighbours") ? (
        <HubCard wide icon="people" title="Neighbours" detail="Find a flat or a name" onPress={() => router.push("/(resident)/neighbours")} />
      ) : null}
    </Screen>
  );
}
