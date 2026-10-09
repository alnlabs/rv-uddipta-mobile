import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { AppState } from "react-native";

const chunk = 1800;

const storage = {
  async getItem(key: string) {
    const countRaw = await SecureStore.getItemAsync(`${key}.n`);
    if (!countRaw) return SecureStore.getItemAsync(key);
    const count = Number(countRaw);
    let value = "";
    for (let index = 0; index < count; index += 1) {
      value += (await SecureStore.getItemAsync(`${key}.${index}`)) ?? "";
    }
    return value || null;
  },
  async setItem(key: string, value: string) {
    if (value.length <= chunk) {
      await SecureStore.setItemAsync(key, value);
      await SecureStore.deleteItemAsync(`${key}.n`).catch(() => undefined);
      return;
    }
    const count = Math.ceil(value.length / chunk);
    await SecureStore.setItemAsync(`${key}.n`, String(count));
    for (let index = 0; index < count; index += 1) {
      await SecureStore.setItemAsync(`${key}.${index}`, value.slice(index * chunk, (index + 1) * chunk));
    }
  },
  async removeItem(key: string) {
    const countRaw = await SecureStore.getItemAsync(`${key}.n`);
    if (countRaw) {
      const count = Number(countRaw);
      for (let index = 0; index < count; index += 1) {
        await SecureStore.deleteItemAsync(`${key}.${index}`).catch(() => undefined);
      }
      await SecureStore.deleteItemAsync(`${key}.n`).catch(() => undefined);
    }
    await SecureStore.deleteItemAsync(key).catch(() => undefined);
  },
};

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? "";

export const supabase = createClient(url, key, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce",
  },
});

AppState.addEventListener("change", (state) => {
  if (state === "active") supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
