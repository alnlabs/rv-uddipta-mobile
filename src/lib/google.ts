import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";

export const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
export const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";

/** Native Google sign-in uses the phone's own client. Expo Go stays on the website flow. */
export function phoneGoogleReady() {
  if (!googleWebClientId) return false;
  if (Constants.executionEnvironment === "storeClient") return false;
  if (Platform.OS === "ios" && !googleIosClientId) return false;
  return true;
}

export async function signInWithPhoneGoogle() {
  const { GoogleSignin } = await import("@react-native-google-signin/google-signin");
  GoogleSignin.configure({
    webClientId: googleWebClientId,
    ...(googleIosClientId ? { iosClientId: googleIosClientId } : {}),
  });
  if (Platform.OS === "android") {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }
  const response = await GoogleSignin.signIn();
  if (response.type !== "success") return false;
  const idToken = response.data.idToken;
  if (!idToken) throw new Error("Google did not return a sign-in token.");
  const { error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: idToken,
  });
  if (error) throw error;
  return true;
}
