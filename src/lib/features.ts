import * as SecureStore from "expo-secure-store";
import { supabase } from "@/lib/supabase";

const CACHE_KEY = "rv_features_v2";

export async function loadFeatures(): Promise<string[] | null> {
  try {
    const { data, error } = await supabase.rpc("list_my_features");
    if (error) throw error;
    if (!Array.isArray(data)) return null;
    const features = data.map(String);
    await SecureStore.setItemAsync(CACHE_KEY, JSON.stringify(features)).catch(() => undefined);
    return features;
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
  // Unknown/failed feature load: keep desks visible. Explicit list still controls off.
  if (features == null) return true;
  return features.includes(key);
}
