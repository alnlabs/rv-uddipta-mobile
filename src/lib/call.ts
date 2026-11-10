import { Linking } from "react-native";
import { supabase } from "@/lib/supabase";

export type CallTarget = {
  ok: boolean
  dial?: string
  showNumber?: boolean
  display?: string | null
  label?: string
  home?: string
  reason?: string
};

function dbError(error: { message: string } | null, fallback: string) {
  if (!error) return;
  throw new Error(error.message || fallback);
}

export async function resolveCall(home: string, which: "owner" | "tenant" = "owner") {
  const { data, error } = await supabase.rpc("resolve_call", {
    target_home: home.trim(),
    which,
  });
  dbError(error, "Could not start that call.");
  return data as CallTarget;
}

export async function neighbourLink(flatId: number) {
  const { data, error } = await supabase.rpc("neighbour_link", {
    target_flat_id: flatId,
  });
  dbError(error, "Could not check that connection.");
  return data as {
    status: string | null
    requestId: number | null
    incoming: boolean
    canCall: boolean
  };
}

export async function placeCall(home: string, which: "owner" | "tenant" = "owner") {
  const result = await resolveCall(home, which);
  if (!result.ok || !result.dial) {
    throw new Error(result.reason || "Could not start that call.");
  }
  const supported = await Linking.canOpenURL(`tel:${result.dial}`).catch(() => true);
  if (!supported) throw new Error("This phone cannot place calls.");
  await Linking.openURL(`tel:${result.dial}`);
  return result;
}
