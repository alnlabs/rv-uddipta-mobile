import { Tabs } from "expo-router";
import { tabIcon } from "@/components/Icon";
import { tabBar } from "@/theme";

export default function PublicTabsLayout() {
  return (
    <Tabs screenOptions={tabBar}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Project",
          tabBarIcon: tabIcon("home"),
        }}
      />
      <Tabs.Screen
        name="amenities"
        options={{
          title: "Features",
          tabBarIcon: tabIcon("model"),
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: "Homes",
          tabBarIcon: tabIcon("floors"),
        }}
      />
    </Tabs>
  );
}
