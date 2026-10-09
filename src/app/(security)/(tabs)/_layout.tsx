import { Tabs } from "expo-router";
import { tabIcon } from "@/components/Icon";
import { tabBar } from "@/theme";

export default function SecurityTabs() {
  return (
    <Tabs screenOptions={tabBar}>
      <Tabs.Screen name="gate" options={{ title: "Gate", tabBarIcon: tabIcon("gate") }} />
      <Tabs.Screen name="visitors" options={{ title: "Visitors", tabBarIcon: tabIcon("people") }} />
      <Tabs.Screen name="deliveries" options={{ title: "Deliveries", tabBarIcon: tabIcon("mail") }} />
      <Tabs.Screen name="more" options={{ title: "More", tabBarIcon: tabIcon("more") }} />
    </Tabs>
  );
}
