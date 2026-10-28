import { memberFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";

async function token() {
  const { data } = await supabase.auth.getSession();
  const value = data.session?.access_token;
  if (!value) throw new Error("Sign in again.");
  return value;
}

export async function loadRegistration() {
  return memberFetch<{
    flatNumber: string | null
    role: string
    name: string
    request: null | {
      status: "pending" | "approved" | "rejected"
      flatNumber: string
      kind: string
      reason: string
    }
  }>("/register", await token());
}

export async function submitRegistration(input: {
  kind: "owner" | "family"
  phone: string
  ownerName: string
  flatNumber: string
}) {
  return memberFetch<{ ok: boolean; status: string; flatNumber: string; message: string }>(
    "/register",
    await token(),
    { method: "POST", body: JSON.stringify(input) },
  );
}

export async function loadAmenities() {
  return memberFetch<{
    canBook: boolean
    slots: { value: string; label: string }[]
    amenities: { id: number; name: string; hours: string }[]
    mine: {
      id: number
      amenityId: number
      home: string
      when: string
      slot: string
      status: string
      space: string
    }[]
  }>("/amenities", await token());
}

export async function bookAmenity(input: { amenityId: number; startsOn: string; slot: string }) {
  return memberFetch<{ ok: boolean; message: string }>("/amenities", await token(), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function loadParking() {
  return memberFetch<{
    canManage: boolean
    home: string | null
    vehicles: { id: number; plate: string; label: string }[]
    bays: { id: number; label: string; kind: string; home: string | null }[]
  }>("/parking", await token());
}

export async function saveVehicle(input: { plate: string; label: string }) {
  return memberFetch<{ ok: boolean; message?: string }>("/parking", await token(), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function removeVehicle(vehicleId: number) {
  return memberFetch<{ ok: boolean }>("/parking", await token(), {
    method: "POST",
    body: JSON.stringify({ action: "remove", vehicleId }),
  });
}

export async function loadNeighbours(q = "") {
  const path = q.trim() ? `/neighbours?q=${encodeURIComponent(q.trim())}` : "/neighbours";
  return memberFetch<{
    homes: {
      home: string
      wing: string
      floor: number
      type: string
      owner: string
      phone: string
      tenant: string
      tenantPhone: string
    }[]
  }>(path, await token());
}

export async function loadCommittee() {
  return memberFetch<{
    canManage: boolean
    items: {
      id: number
      title: string
      body: string
      kind: string
      status: string
      decision: string
    }[]
  }>("/committee", await token());
}

export async function decideCommittee(input: {
  itemId: number
  title: string
  body: string
  kind: string
  decision: string
}) {
  return memberFetch<{ ok: boolean }>("/committee", await token(), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function walkInVisitor(input: {
  visitorName: string
  flatNumber: string
  purpose: string
}) {
  return memberFetch<{ code: string }>("/gate", await token(), {
    method: "POST",
    body: JSON.stringify({ action: "walkin", ...input }),
  });
}
