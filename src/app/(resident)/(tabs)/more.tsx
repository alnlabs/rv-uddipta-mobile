import { Linking, Text } from "react-native";
import { useRouter } from "expo-router";
import { MenuRow, Screen, SignOut } from "@/components/Screen";
import { ui } from "@/theme";

const site = "https://uddipta.vercel.app";

export default function MoreScreen() {
  const router = useRouter();
  return (
    <Screen>
      <Text style={ui.eyebrow}>Account</Text>
      <Text style={ui.title}>More</Text>
      <Text style={ui.label}>Visitors</Text>
      <MenuRow icon="people" title="Invite a visitor" onPress={() => router.push("/(resident)/invite")} />
      <MenuRow icon="feed" title="Visitor history" onPress={() => router.push("/(resident)/history")} />
      <Text style={ui.label}>Home</Text>
      <MenuRow icon="flat" title="Profile" detail="Your account and role" onPress={() => router.push("/(resident)/profile")} />
      <MenuRow icon="bell" title="Notifications" onPress={() => router.push("/(resident)/notifications")} />
      <Text style={ui.label}>Building</Text>
      <MenuRow
        icon="model"
        title="Floor plans"
        detail="Opens the existing plans on the website. They are not redrawn here."
        onPress={() => { Linking.openURL(`${site}/community?view=3d`).catch(() => undefined); }}
      />
      <SignOut />
    </Screen>
  );
}
