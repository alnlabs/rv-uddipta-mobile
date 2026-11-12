import { supabase } from "@/lib/supabase";

function dbError(error: { message?: string } | null, fallback: string) {
  if (error) throw new Error(error.message || fallback);
}

export type DocRequest = {
  id: number
  kind: string
  title: string
  status: string
  note: string | null
  home: string
  rejectReason: string | null
  at: string
};

export type WorkforcePerson = {
  id: number
  kind: string
  name: string
  phone: string | null
  code: string
  blacklisted: boolean
  active: boolean
  home: string
  note: string | null
};

export type CircularItem = {
  id: number
  title: string
  body: string
  at: string
  read: boolean
};

export type OpsItem = {
  id: number
  kind: string
  status: string
  title: string
  body: string | null
  at: string
};

export async function loadMyDocuments() {
  const { data, error } = await supabase.rpc("list_my_documents");
  dbError(error, "Could not load document requests.");
  const requests = Array.isArray((data as { requests?: unknown } | null)?.requests)
    ? ((data as { requests: Record<string, unknown>[] }).requests)
    : [];
  return requests.map((row) => ({
    id: Number(row.id),
    kind: String(row.kind || ""),
    title: String(row.title || ""),
    status: String(row.status || ""),
    note: row.note ? String(row.note) : null,
    home: String(row.home || ""),
    rejectReason: row.rejectReason ? String(row.rejectReason) : null,
    at: String(row.at || ""),
  })) satisfies DocRequest[];
}

export async function requestDocument(input: { kind: string; title: string; note?: string }) {
  const { error } = await supabase.rpc("request_my_document", {
    kind: input.kind,
    title: input.title,
    note: input.note || null,
  });
  dbError(error, "Could not submit that request.");
}

export async function loadMyWorkforce() {
  const { data, error } = await supabase.rpc("list_my_workforce");
  dbError(error, "Could not load helpers.");
  const people = Array.isArray((data as { people?: unknown } | null)?.people)
    ? ((data as { people: Record<string, unknown>[] }).people)
    : [];
  return people.map((row) => ({
    id: Number(row.id),
    kind: String(row.kind || ""),
    name: String(row.name || ""),
    phone: row.phone ? String(row.phone) : null,
    code: String(row.code || ""),
    blacklisted: Boolean(row.blacklisted),
    active: Boolean(row.active),
    home: String(row.home || ""),
    note: row.note ? String(row.note) : null,
  })) satisfies WorkforcePerson[];
}

export async function addWorkforce(input: { kind: string; name: string; phone?: string; note?: string }) {
  const { data, error } = await supabase.rpc("add_my_workforce", {
    kind: input.kind,
    name: input.name,
    phone: input.phone || null,
    note: input.note || null,
  });
  dbError(error, "Could not add that helper.");
  return data as { ok?: boolean; code?: string };
}

export async function lookupWorkforceCode(code: string) {
  const { data, error } = await supabase.rpc("lookup_workforce_code", {
    pass_code: code.trim().toUpperCase(),
  });
  dbError(error, "Could not check that helper pass.");
  return data as {
    id: number
    name: string
    kind: string
    phone: string | null
    code: string
    home: string | null
    blacklisted: boolean
    active: boolean
    allowed: boolean
  };
}

export async function loadMyCirculars() {
  const { data, error } = await supabase.rpc("list_my_circulars");
  dbError(error, "Could not load circulars.");
  const items = Array.isArray((data as { items?: unknown } | null)?.items)
    ? ((data as { items: Record<string, unknown>[] }).items)
    : [];
  return items.map((row) => ({
    id: Number(row.id),
    title: String(row.title || ""),
    body: String(row.body || ""),
    at: String(row.at || ""),
    read: Boolean(row.read),
  })) satisfies CircularItem[];
}

export async function ackCircular(circularId: number) {
  const { error } = await supabase.rpc("ack_my_circular", { circular_id: circularId });
  dbError(error, "Could not acknowledge that circular.");
}

export async function loadBuildingOps() {
  const { data, error } = await supabase.rpc("list_building_ops");
  dbError(error, "Could not load building ops.");
  const open = Array.isArray((data as { open?: unknown } | null)?.open)
    ? ((data as { open: Record<string, unknown>[] }).open)
    : [];
  return open.map((row) => ({
    id: Number(row.id),
    kind: String(row.kind || ""),
    status: String(row.status || ""),
    title: String(row.title || ""),
    body: row.body ? String(row.body) : null,
    at: String(row.at || ""),
  })) satisfies OpsItem[];
}
