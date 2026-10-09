import { Tabs } from "expo-router";
import { tabIcon } from "@/components/Icon";
import { tabBar } from "@/theme";

export default function ResidentTabs() {
  return (
    <Tabs screenOptions={tabBar}>
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: tabIcon("home") }} />
      <Tabs.Screen name="community" options={{ title: "Community", tabBarIcon: tabIcon("feed") }} />
      <Tabs.Screen name="services" options={{ title: "Services", tabBarIcon: tabIcon("form") }} />
      <Tabs.Screen name="more" options={{ title: "More", tabBarIcon: tabIcon("more") }} />
    </Tabs>
  );
}
