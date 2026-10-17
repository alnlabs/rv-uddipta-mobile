import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { HubCard } from "@/components/Blocks";
import { Screen } from "@/components/Screen";
import { ui } from "@/theme";

export default function CommunityScreen() {
  const router = useRouter();
  return (
    <Screen underHeader>
      <Text style={ui.heading}>Community</Text>
      <Text style={ui.body}>Posts from neighbours sit apart from official notices.</Text>
      <HubCard
        wide
        icon="feed"
        title="Feed"
        detail="Updates, questions, and photos from homes"
        onPress={() => router.push("/(resident)/feed")}
      />
      <View style={{ flexDirection: "row", gap: 12 }}>
        <HubCard icon="schedule" title="Events" detail="Dates and who is going" onPress={() => router.push("/(resident)/events")} />
        <HubCard icon="poll" title="Polls" detail="Choices and results" onPress={() => router.push("/(resident)/polls")} />
      </View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <HubCard icon="form" title="Forms" detail="One answer per home" onPress={() => router.push("/(resident)/forms")} />
        <HubCard office icon="bell" title="Notices" detail="From the office" onPress={() => router.push("/(resident)/notices")} />
      </View>
    </Screen>
  );
}
