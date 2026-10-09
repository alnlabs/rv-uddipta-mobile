import { Tabs } from "expo-router";
import { tabIcon } from "@/components/Icon";
import { tabBar } from "@/theme";

export default function StaffTabs() {
  return (
    <Tabs screenOptions={tabBar}>
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: tabIcon("home") }} />
      <Tabs.Screen name="tasks" options={{ title: "My Tasks", tabBarIcon: tabIcon("form") }} />
      <Tabs.Screen name="schedule" options={{ title: "Schedule", tabBarIcon: tabIcon("schedule") }} />
      <Tabs.Screen name="more" options={{ title: "More", tabBarIcon: tabIcon("more") }} />
    </Tabs>
  );
}
