import { View } from "react-native";
import { Tabs } from "expo-router";
import { ResidentBar } from "@/components/AppBar";
import { tabIcon } from "@/components/Icon";
import { colors, tabBar } from "@/theme";

export default function ResidentTabs() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
    <ResidentBar />
    <Tabs screenOptions={tabBar}>
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: tabIcon("home") }} />
      <Tabs.Screen name="community" options={{ title: "Community", tabBarIcon: tabIcon("feed") }} />
      <Tabs.Screen name="services" options={{ title: "Services", tabBarIcon: tabIcon("form") }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: tabIcon("user") }} />
    </Tabs>
    </View>
  );
}
