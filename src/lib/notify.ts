import Constants from "expo-constants";
import * as Device from "expo-device";
import { isRunningInExpoGo } from "expo";
import { Platform } from "react-native";
import { memberFetch } from "@/lib/api";
import { notificationPath } from "@/lib/community";

type NotificationsModule = typeof import("expo-notifications");

function loadNotifications(): NotificationsModule | null {
  if (Platform.OS === "android" && isRunningInExpoGo()) return null;
  return require("expo-notifications") as NotificationsModule;
}

const Notifications = loadNotifications();

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function registerPush(token: string) {
  if (!Notifications || !Device.isDevice) return;
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted
    ? current
    : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "RV Uddiipta",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId) return;
  const push = await Notifications.getExpoPushTokenAsync({ projectId });
  await memberFetch("/device", token, {
    method: "POST",
    body: JSON.stringify({ token: push.data }),
  }).catch(() => undefined);
}

export function pathFromPush(data: Record<string, unknown> | undefined) {
  if (!data) return null;
  const kind = String(data.kind || data.type || "");
  const href = String(data.href || data.url || data.path || "");
  const passId = data.passId || data.pass_id;
  if (passId) return `/(resident)/pass/${passId}`;
  const path = notificationPath(kind, href);
  return path;
}

export function attachPushRouting(open: (path: string) => void) {
  if (!Notifications) return () => undefined;
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, unknown> | undefined;
    const path = pathFromPush(data);
    if (path) open(path);
  });
  Notifications.getLastNotificationResponseAsync()
    .then((response) => {
      if (!response) return;
      const data = response.notification.request.content.data as Record<string, unknown> | undefined;
      const path = pathFromPush(data);
      if (path) open(path);
    })
    .catch(() => undefined);
  return () => sub.remove();
}

export async function setAppBadge(count: number) {
  if (!Notifications) return;
  try {
    await Notifications.setBadgeCountAsync(Math.max(0, count));
  } catch {
    /* ignore on unsupported */
  }
}
