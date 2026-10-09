import { Text } from "react-native";
import { useRouter } from "expo-router";
import { MenuRow, Screen } from "@/components/Screen";
import { ui } from "@/theme";

export default function ServicesScreen() {
  const router = useRouter();
  return (
    <Screen>
      <Text style={ui.eyebrow}>Office</Text>
      <Text style={ui.title}>Services</Text>
      <MenuRow icon="form" title="New request" detail="Tell the office what you need" onPress={() => router.push("/(resident)/request/new")} />
      <MenuRow icon="mail" title="My requests" detail="Status and replies" onPress={() => router.push("/(resident)/requests")} />
      <Text style={ui.body}>Amenity booking is not available in the app yet.</Text>
    </Screen>
  );
}
