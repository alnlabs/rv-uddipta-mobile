import { useCallback, useState } from "react";
import { View } from "react-native";
import { Tabs, useFocusEffect, useRouter, useSegments } from "expo-router";
import { ResidentBar } from "@/components/AppBar";
import { tabIcon } from "@/components/Icon";
import { PageBusy } from "@/components/Screen";
import { loadAccount } from "@/lib/community";
import { canManageArea } from "@/lib/office";
import { colors, tabBar } from "@/theme";

async function hasAdminAccess(account: Awaited<ReturnType<typeof loadAccount>>) {
  if (account.superAdmin) return false;
  if (account.role === "admin" || account.role === "facility") return true;
  if (account.roles.some((item) => item.role === "admin" || item.role === "facility")) return true;
  return canManageArea("repairs");
}

export default function ResidentTabs() {
  const router = useRouter();
  const segments = useSegments();
  const tab = segments.at(-1);
  const onHome = !tab || tab === "(tabs)" || tab === "index";
  const [blocked, setBlocked] = useState<boolean | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);

  useFocusEffect(useCallback(() => {
    let live = true;
    (async () => {
      try {
        const account = await loadAccount();
        if (!live) return;
        if (account.superAdmin) {
          setBlocked(true);
          router.replace("/(super)");
          return;
        }
        setShowAdmin(await hasAdminAccess(account));
        setBlocked(false);
      } catch {
        if (live) {
          setShowAdmin(false);
          setBlocked(false);
        }
      }
    })();
    return () => { live = false; };
  }, [router]));

  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      {onHome ? <ResidentBar /> : null}
      {blocked === false ? (
        <Tabs screenOptions={tabBar}>
          <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: tabIcon("home") }} />
          <Tabs.Screen name="feed" options={{ title: "Feed", tabBarIcon: tabIcon("feed") }} />
          <Tabs.Screen name="services" options={{ title: "Services", tabBarIcon: tabIcon("form") }} />
          <Tabs.Screen name="community" options={{ title: "Community", tabBarIcon: tabIcon("people") }} />
          <Tabs.Screen
            name="admin"
            options={{
              title: "Admin",
              tabBarIcon: tabIcon("admin"),
              href: showAdmin ? undefined : null,
            }}
          />
        </Tabs>
      ) : (
        <PageBusy />
      )}
    </View>
  );
}
