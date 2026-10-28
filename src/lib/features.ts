import * as SecureStore from "expo-secure-store";
import { memberFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";

const CACHE_KEY = "rv_features_v1";

const FALLBACK = [
  "feed",
  "announcements",
  "events",
  "polls",
  "forms",
  "neighbours",
  "requests",
  "visitor_passes",
  "gate",
  "parking",
  "inbox",
  "amenities",
  "maintenance",
  "committee",
];

export async function loadFeatures(): Promise<string[]> {
  try {
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) return FALLBACK;
    const data = await memberFetch<{ features: string[] }>("/features", token);
    const features = Array.isArray(data.features) ? data.features : FALLBACK;
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
    return FALLBACK;
  }
}

export function featureOn(features: string[] | null | undefined, key: string) {
  if (!features) return true;
  return features.includes(key);
}
