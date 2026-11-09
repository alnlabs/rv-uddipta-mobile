import * as SecureStore from "expo-secure-store";
import { memberFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";

const CACHE_KEY = "rv_features_v1";

export async function loadFeatures(): Promise<string[] | null> {
  try {
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) return null;
    const data = await memberFetch<{ features: string[] }>("/features", token);
    if (!Array.isArray(data.features)) return null;
    await SecureStore.setItemAsync(CACHE_KEY, JSON.stringify(data.features)).catch(() => undefined);
    return data.features.map(String);
  } catch {
    const cached = await SecureStore.getItemAsync(CACHE_KEY).catch(() => null);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch {
        /* ignore */
      }
    }
    return null;
  }
}

export function featureOn(features: string[] | null | undefined, key: string) {
  if (!features) return false;
  return features.includes(key);
}
