import { supabase } from "@/lib/supabase";
import { type Account } from "@/lib/place";

const LABELS: Record<string, string> = {
  owner: "Owner",
  co_owner: "Family",
  tenant: "Tenant",
  visitor: "Visitor",
  builder: "Builder",
  admin: "Admin",
  committee: "Committee",
  facility: "Facility manager",
  staff: "Service staff",
  security: "Security",
};

function label(role: string) {
  return LABELS[role] || role;
}

function phonePlace(role: string) {
  if (role === "security") return "gate";
  if (role === "staff" || role === "facility") return "work";
  return "home";
}

function greeting(name: string) {
  const hour = new Date().getHours();
  const when = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const who = name.trim().split(/\s+/)[0];
  return who ? `${when}, ${who}` : when;
}

function when(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function plain(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function dbError(error: { message: string } | null, fallback: string) {
  if (!error) return;
  const message = error.message || fallback;
  if (/network|fetch|offline|failed to fetch/i.test(message)) {
    throw new Error("You are offline. Try again when the connection is back.");
  }
  throw new Error(message);
}

export async function loadAccount(): Promise<Account> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error(userError?.message || "Sign in again.");
  const user = userData.user;
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, flat_id, display_name")
    .eq("user_id", user.id)
    .maybeSingle();
  dbError(error, "Could not load your home.");

  const role = profile?.role || "visitor";
  const name = profile?.display_name || String(user.user_metadata?.full_name || user.email || "");
  let flatNumber: string | null = null;
  if (profile?.flat_id) {
    const { data: flat } = await supabase
      .from("flats_public")
      .select("flat_number")
      .eq("id", profile.flat_id)
      .maybeSingle();
    flatNumber = flat?.flat_number ? String(flat.flat_number) : null;
  }

  const { data: held } = await supabase.from("person_roles").select("role").eq("user_id", user.id);
  const roleNames = [...new Set((held?.length ? held.map((row) => String(row.role)) : [role]))];
  const place = phonePlace(role);
  return {
    greeting: greeting(name),
    name,
    role,
    roleLabel: label(role),
    place,
    roles: roleNames.map((item) => ({ role: item, label: label(item) })),
    canSwitch: roleNames.length > 1,
    flatNumber: place === "home" ? flatNumber : null,
    home: place === "home" && !flatNumber ? "No home is linked to this account yet." : null,
  };
}

export async function switchAccountRole(role: string) {
  const { error } = await supabase.rpc("switch_my_role", { next_role: role });
  dbError(error, "Could not switch.");
  return phonePlace(role);
}

const NOTICE_KINDS = ["announcement", "builder_update", "maintenance", "meeting"];

function noticeLabel(kind: string) {
  if (kind === "meeting") return "Meeting";
  if (kind === "maintenance") return "Maintenance";
  return "Notice";
}

export async function loadUpdates() {
  const [{ data: posts, error: postError }, { data: notices, error: noticeError }] = await Promise.all([
    supabase
      .from("member_posts")
      .select("id, author_name, flat_number, kind, body, created_at")
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("activity_events")
      .select("id, title, body, created_at, kind, pinned")
      .in("kind", NOTICE_KINDS)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  if (noticeError) throw new Error(noticeError.message);
  const noticeRows = [...(notices ?? [])].sort((a, b) => Number(b.pinned) - Number(a.pinned));
  return {
    notices: noticeRows.map((notice) => ({
      id: notice.id as number,
      label: noticeLabel(String(notice.kind)),
      title: String(notice.title || ""),
      body: plain(String(notice.body || "")),
      date: when(String(notice.created_at)),
    })),
    updates: postError
      ? []
      : (posts ?? [])
          .filter((post) => post.kind !== "request" && post.kind !== "feedback")
          .map((post) => ({
            id: post.id as number,
            label: "Update",
            who: post.flat_number ? `${post.author_name} · ${post.flat_number}` : String(post.author_name),
            body: plain(String(post.body || "")),
            date: when(String(post.created_at)),
          })),
  };
}

const PASS_STATUS: Record<string, string> = {
  pending_approval: "Waiting for you",
  expected: "Expected",
  waiting: "Waiting at the gate",
  inside: "Inside",
  left: "Left",
  refused: "Refused",
  cancelled: "Cancelled",
};

export async function loadPasses() {
  const account = await loadAccount();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  const { data, error } = await supabase
    .from("visitor_passes")
    .select("id, code, visitor_name, purpose, visit_on, status, flat_number, host_user_id")
    .order("created_at", { ascending: false })
    .limit(30);
  dbError(error, "Could not load passes.");
  return {
    canCreate: account.role !== "visitor" && Boolean(account.flatNumber),
    passes: (data ?? []).map((pass) => ({
      id: pass.id as number,
      code: String(pass.code),
      name: String(pass.visitor_name),
      purpose: String(pass.purpose || ""),
      date: String(pass.visit_on),
      home: String(pass.flat_number || ""),
      status: PASS_STATUS[String(pass.status)] || String(pass.status),
      raw: String(pass.status),
      canDecide: pass.status === "pending_approval" && pass.host_user_id === userId,
      atGate: pass.status === "waiting" && pass.host_user_id === userId,
    })),
  };
}

export async function createPass(input: {
  visitorName: string
  phone: string
  purpose: string
  visitOn: string
}) {
  const visit = /^\d{4}-\d{2}-\d{2}$/.test(input.visitOn) ? input.visitOn : new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase.rpc("create_my_pass", {
    visitor_name: input.visitorName,
    phone: input.phone,
    purpose: input.purpose,
    visit_on: visit,
  });
  dbError(error, "Could not create the pass.");
  return String(data || "");
}

export async function decidePass(passId: number, status: "expected" | "refused") {
  const { error } = await supabase.rpc("decide_my_pass", { pass_id: passId, next_status: status });
  dbError(error, "Could not update the pass.");
}

const NOTE_STATUS: Record<string, string> = {
  new: "New",
  in_progress: "In progress",
  waiting: "Waiting on you",
  done: "Done",
  open: "New",
  read: "Waiting on you",
};

export async function loadRequests() {
  const account = await loadAccount();
  const { data: notes, error } = await supabase
    .from("member_notes")
    .select("id, kind, body, status, created_at")
    .order("created_at", { ascending: false })
    .limit(40);
  dbError(error, "Could not load requests.");
  const ids = (notes ?? []).map((note) => note.id as number);
  const { data: lines } = ids.length
    ? await supabase
        .from("note_messages")
        .select("id, note_id, author_name, from_office, body, created_at")
        .in("note_id", ids)
        .order("created_at", { ascending: true })
    : { data: [] };
  return {
    canSend: account.role !== "visitor",
    requests: (notes ?? []).map((note) => ({
      id: note.id as number,
      kind: note.kind === "feedback" ? "Feedback" : "Request",
      body: String(note.body),
      status: REQUEST_STATUS[String(note.status)] || NOTE_STATUS[String(note.status)] || String(note.status),
      date: when(String(note.created_at)),
      canReply: note.status !== "done",
      messages: (lines ?? [])
        .filter((line) => line.note_id === note.id)
        .map((line) => ({
          id: line.id as number,
          who: line.from_office ? "Office" : String(line.author_name),
          body: String(line.body),
        })),
    })),
  };
}

export const REQUEST_CATEGORIES = ["Plumbing", "Electrical", "Housekeeping", "Lift", "Security", "Other"];

const REQUEST_STATUS: Record<string, string> = {
  new: "Submitted",
  open: "Submitted",
  waiting: "Acknowledged",
  read: "Acknowledged",
  in_progress: "In progress",
  done: "Resolved",
};

export async function sendRequest(body: string, category = "General") {
  const { error } = await supabase.rpc("send_my_request", { message: body, category });
  dbError(error, "Could not send that.");
  return "Request sent.";
}

export async function replyRequest(noteId: number, body: string) {
  const { error } = await supabase.rpc("reply_my_request", { target_note: noteId, message: body });
  dbError(error, "Could not send that.");
  return "Sent.";
}

export async function loadAttention() {
  const [passes, requests, notices, notifications] = await Promise.all([
    loadPasses().catch(() => ({ canCreate: false, passes: [] as Awaited<ReturnType<typeof loadPasses>>["passes"] })),
    loadRequests().catch(() => ({ canSend: false, requests: [] as Awaited<ReturnType<typeof loadRequests>>["requests"] })),
    loadNotices().catch(() => []),
    loadNotifications().catch(() => []),
  ]);
  return {
    waitingVisitors: passes.passes.filter((pass) => pass.canDecide || pass.atGate),
    waitingRequests: requests.requests.filter((item) => item.status === "Acknowledged"),
    notices: notices.slice(0, 2),
    unread: notifications.filter((item) => !item.read),
  };
}

export async function loadNotices() {
  const { data, error } = await supabase
    .from("activity_events")
    .select("id, title, body, created_at, kind, pinned")
    .in("kind", NOTICE_KINDS)
    .order("created_at", { ascending: false })
    .limit(40);
  dbError(error, "Could not load notices.");
  const ids = (data ?? []).map((notice) => notice.id as number);
  const { data: reads, error: readError } = ids.length
    ? await supabase.from("notice_reads").select("notice_id").in("notice_id", ids)
    : { data: [], error: null };
  const seen = new Set((reads ?? []).map((row) => Number(row.notice_id)));
  return (data ?? [])
    .sort((a, b) => Number(b.pinned) - Number(a.pinned))
    .map((notice) => ({
      id: notice.id as number,
      label: noticeLabel(String(notice.kind)),
      important: Boolean(notice.pinned),
      title: String(notice.title || "Notice"),
      body: plain(String(notice.body || "")),
      date: when(String(notice.created_at)),
      read: readError ? null : seen.has(notice.id as number),
    }));
}

export async function markNoticeRead(id: number) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Sign in again.");
  const { error } = await supabase.from("notice_reads").insert({ user_id: userId, notice_id: id });
  if (error && !/duplicate|unique/i.test(error.message)) dbError(error, "Could not mark that notice as read.");
}

export async function loadNotice(id: number) {
  const notices = await loadNotices();
  return notices.find((notice) => notice.id === id) ?? null;
}

export async function loadNotifications() {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, kind, title, body, href, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(40);
  dbError(error, "Could not load notifications.");
  return (data ?? []).map((item) => ({
    id: item.id as number,
    kind: String(item.kind),
    title: String(item.title),
    body: plain(String(item.body || "")),
    href: String(item.href || ""),
    read: Boolean(item.read_at),
    date: when(String(item.created_at)),
  }));
}

export async function markNotificationRead(id: number) {
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
}

export function notificationPath(kind: string, href: string) {
  const value = `${kind} ${href}`.toLowerCase();
  if (value.includes("delivery")) return null;
  if (value.includes("visitor") || value.includes("pass")) return "/(resident)/history";
  if (value.includes("notice") || value.includes("announce")) return "/(resident)/notices";
  const post = href.match(/post\/(\d+)/);
  if (post && (value.includes("post") || value.includes("reply") || value.includes("feed") || value.includes("event") || value.includes("poll"))) {
    return `/(resident)/post/${post[1]}`;
  }
  if (value.includes("event")) return "/(resident)/events";
  if (value.includes("poll")) return "/(resident)/polls";
  if (value.includes("reply") || value.includes("feed")) return "/(resident)/feed";
  if (value.includes("task") || value.includes("work")) return "/(staff)/tasks";
  return "/(resident)/requests";
}

export async function answerArrival(passId: number, allow: boolean) {
  const { error } = await supabase.rpc("answer_arrival", { pass_id: passId, allow });
  dbError(error, "Could not send your answer.");
}

export async function cancelPass(passId: number) {
  const { error } = await supabase.rpc("cancel_my_pass", { pass_id: passId });
  dbError(error, "Could not cancel the pass.");
}

export async function loadPass(id: number) {
  const { data, error } = await supabase
    .from("visitor_passes")
    .select("id, code, visitor_name, purpose, visit_on, status, flat_number, host_user_id, visitor_phone, host_answer")
    .eq("id", id)
    .maybeSingle();
  dbError(error, "Could not load the pass.");
  return data;
}

export async function lookupPass(code: string) {
  const { data, error } = await supabase.rpc("gate_lookup", { pass_code: code.trim().toUpperCase() });
  dbError(error, "Could not check that pass.");
  return data as {
    found: boolean
    id?: number
    code?: string
    name?: string
    home?: string
    purpose?: string
    status?: string
    date?: string
    valid?: boolean
    answer?: string | null
  };
}

export async function loadHelp() {
  const { data, error } = await supabase
    .from("project_info")
    .select("emergency_contacts, gate_rules")
    .eq("id", 1)
    .maybeSingle();
  dbError(error, "Could not load gate notes.");
  return {
    contacts: String(data?.emergency_contacts || "").trim(),
    rules: String(data?.gate_rules || "").trim(),
  };
}

export async function setGateStatus(passId: number, status: "waiting" | "inside" | "left") {
  const { error } = await supabase.rpc("gate_set_status", { pass_id: passId, next_status: status });
  dbError(error, "Could not record that.");
}

export async function loadGatePasses() {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("visitor_passes")
    .select("id, code, visitor_name, flat_number, purpose, status, visit_on")
    .order("created_at", { ascending: false })
    .limit(80);
  dbError(error, "Could not load the gate.");
  const rows = data ?? [];
  return {
    pending: rows.filter((row) => row.status === "pending_approval"),
    expected: rows.filter((row) => row.status === "expected" && row.visit_on === today),
    inside: rows.filter((row) => row.status === "inside"),
    left: rows.filter((row) => row.status === "left"),
    refused: rows.filter((row) => row.status === "refused" || row.status === "cancelled"),
  };
}

export async function loadTasks() {
  const { data, error } = await supabase
    .from("work_orders")
    .select("id, title, place, body, status, created_at")
    .order("created_at", { ascending: false })
    .limit(40);
  dbError(error, "Could not load tasks.");
  return data ?? [];
}

export async function updateTask(id: number, status: "in_progress" | "done", note = "") {
  const { error } = await supabase.rpc("update_my_task", { task_id: id, next_status: status, note });
  dbError(error, "Could not update the task.");
}

export async function loadDeliveries() {
  const { data, error } = await supabase
    .from("deliveries")
    .select("id, flat_number, label, status, created_at")
    .order("created_at", { ascending: false })
    .limit(40);
  dbError(error, "Could not load deliveries.");
  return data ?? [];
}

export async function recordDelivery(flatNumber: string, label: string) {
  const { error } = await supabase.rpc("record_delivery", {
    home: flatNumber.trim().toUpperCase(),
    label: label.trim(),
  });
  dbError(error, "Could not record the delivery.");
}
