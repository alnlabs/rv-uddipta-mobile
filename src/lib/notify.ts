import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { memberFetch } from "@/lib/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerPush(token: string) {
  if (!Device.isDevice) return;
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
