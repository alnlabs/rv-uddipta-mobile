import { Text } from "react-native";
import { useRouter } from "expo-router";
import { MenuRow, Screen } from "@/components/Screen";
import { ui } from "@/theme";

export default function ServicesScreen() {
  const router = useRouter();
  return (
    <Screen underHeader>
      <Text style={ui.heading}>Services</Text>
      <MenuRow icon="form" title="Raise a complaint" detail="Water, lift, cleaning, and other issues" onPress={() => router.push("/(resident)/request/new")} />
      <MenuRow icon="mail" title="Complaint history" detail="Status and office replies" onPress={() => router.push("/(resident)/requests")} />
      <MenuRow icon="schedule" title="Maintenance" detail="Official notices. Billing records when the office publishes them." onPress={() => router.push("/(resident)/maintenance")} />
      <MenuRow icon="floors" title="Community status" detail="Water, electricity, and lift updates" onPress={() => router.push("/(resident)/status")} />
      <Text style={ui.label}>Visitors</Text>
      <MenuRow icon="people" title="Invite a visitor" detail="Pre-register someone for the gate" onPress={() => router.push("/(resident)/invite")} />
      <MenuRow icon="gate" title="Visitor history" detail="Passes, approvals, and past visits" onPress={() => router.push("/(resident)/history")} />
      <Text style={ui.body}>Amenity booking is not available in the app yet.</Text>
    </Screen>
  );
}
