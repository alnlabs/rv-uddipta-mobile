import * as SecureStore from "expo-secure-store";
import { indiaDay } from "@/lib/day";
import { htmlToPlain } from "@/lib/html";
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

function phonePlace(role: string, superAdmin = false) {
  if (superAdmin) return "office";
  if (role === "security") return "gate";
  if (role === "staff" || role === "facility") return "work";
  return "home";
}

function localSuperAdminEmail(email: string | null | undefined) {
  const value = email?.trim().toLowerCase();
  if (!value) return false;
  const listed = (process.env.EXPO_PUBLIC_ADMIN_EMAILS || "")
    .split(",")
    .map((item: string) => item.trim().toLowerCase())
    .filter(Boolean);
  return listed.includes(value);
}

async function loadSuperAdminFlag(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return false;
  const local = localSuperAdminEmail(session.user.email);
  try {
    const { data: flagged, error } = await supabase.rpc("is_platform_admin");
    // DB platform_admins is source when the migration is live; env is fallback / OR.
    if (!error) return Boolean(flagged) || local;
  } catch {
    /* RPC missing until db push */
  }
  return local;
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

  // Attach a home the office already linked (Google / owner email) even if this
  // account first signed in as "just exploring".
  try {
    await supabase.rpc("ensure_my_home");
  } catch {
    // RPC missing until migration is pushed — continue with profile as-is.
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, flat_id, display_name")
    .eq("user_id", user.id)
    .maybeSingle();
  dbError(error, "Could not load your home.");

  let role = profile?.role || "visitor";
  let flatId = profile?.flat_id ? Number(profile.flat_id) : null;
  let flatNumber: string | null = null;
  let wing: string | null = null;
  let flatLookupFailed = false;
  const name = profile?.display_name || String(user.user_metadata?.full_name || user.email || "");

  const superAdmin = await loadSuperAdminFlag();
  const { data: held } = superAdmin
    ? { data: [] as { role: string; flat_id?: number | null }[] }
    : await supabase.from("person_roles").select("role, flat_id").eq("user_id", user.id);

  if (!flatId && !superAdmin) {
    const homeHeld = (held ?? []).find(
      (row) =>
        row.flat_id
        && (row.role === "owner" || row.role === "co_owner" || row.role === "tenant"),
    );
    if (homeHeld?.flat_id) {
      flatId = Number(homeHeld.flat_id);
      if (role === "visitor") role = String(homeHeld.role);
    } else {
      // Fallback when ensure_my_home is not on the DB yet: read the linked unit.
      const { data: owned } = await supabase
        .from("flats")
        .select("id, flat_number, wing")
        .eq("user_id", user.id)
        .maybeSingle();
      if (owned?.id) {
        flatId = Number(owned.id);
        if (role === "visitor") role = "owner";
        flatNumber = owned.flat_number ? String(owned.flat_number) : null;
        wing = owned.wing ? String(owned.wing) : null;
      }
    }
  }

  const claimsAFlat = role === "owner" || role === "co_owner" || role === "tenant";
  const hasFlat = Boolean(flatId);
  if (flatId && !flatNumber) {
    const { data: flat, error: flatError } = await supabase
      .from("flats_public")
      .select("flat_number, wing")
      .eq("id", flatId)
      .maybeSingle();
    flatLookupFailed = Boolean(flatError);
    flatNumber = flat?.flat_number ? String(flat.flat_number) : null;
    wing = flat?.wing ? String(flat.wing) : wing;
  }

  const roleNames = [...new Set([role, ...(held ?? []).map((row) => String(row.role))])];
  const place = phonePlace(role, superAdmin);
  const joinIntent = String(user.user_metadata?.joinIntent || "");
  const { data: request } = await supabase
    .from("registration_requests")
    .select("status, flat_number, request_kind, intent_path, reject_reason")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const joinRequest = request
    ? {
        status: request.status as "pending" | "approved" | "rejected",
        flatNumber: request.flat_number ? String(request.flat_number) : null,
        kind: String(request.request_kind || "owner"),
        path: String(request.intent_path || "home"),
        reason: String(request.reject_reason || ""),
      }
    : null;
  const joinPending = !superAdmin && role === "visitor" && joinRequest?.status === "pending";
  const joinRejected = joinRequest?.status === "rejected";
  const joinBrowse =
    !superAdmin
    && role === "visitor"
    && !joinPending
    && !joinRejected
    && joinIntent === "browse";
  const needsJoin =
    !superAdmin && role === "visitor" && !joinPending && !joinBrowse;

  let claimNote: string | null = null;
  if (joinPending) {
    claimNote = joinRequest?.flatNumber
      ? `Your request for ${joinRequest.flatNumber} is waiting for the office.`
      : "Your access request is waiting for the office.";
  } else if (joinRejected) {
    claimNote = joinRequest?.reason || "Your request was not approved. You can send a new one.";
  } else if (!superAdmin && !flatLookupFailed && place === "home" && !hasFlat && claimsAFlat) {
    claimNote = "No home is linked yet. Claim your flat so the office can approve you.";
  } else if (needsJoin) {
    claimNote = "Tell the office who you are so they can open the right access.";
  }

  return {
    greeting: greeting(name),
    name,
    role: superAdmin ? "admin" : role,
    roleLabel: superAdmin ? "Super admin" : label(role),
    place,
    roles: superAdmin ? [{ role: "admin", label: "Super admin" }] : roleNames.map((item) => ({ role: item, label: label(item) })),
    canSwitch: !superAdmin && roleNames.length > 1,
    hasFlat,
    // Keep the flat label whenever linked — place shells should not hide invite/complaints.
    flatNumber: !hasFlat ? null : flatNumber || (flatLookupFailed ? "Home" : null),
    wing: hasFlat ? wing : null,
    home: claimNote,
    needsClaim: needsJoin || (!superAdmin && !flatLookupFailed && place === "home" && !hasFlat && claimsAFlat),
    needsJoin,
    joinPending,
    joinBrowse,
    joinRequest,
    superAdmin,
  };
}

export async function switchAccountRole(role: string) {
  if (await loadSuperAdminFlag()) throw new Error("Super admin accounts stay on the platform screens.");
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
      body: String(notice.body || ""),
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
            body: String(post.body || ""),
            date: when(String(post.created_at)),
          })),
  };
}

const PASS_STATUS: Record<string, string> = {
  pending_approval: "Needs approval",
  expected: "Ready for the gate",
  waiting: "At the gate",
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
    canCreate: account.role !== "visitor" && account.hasFlat,
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
  const visit = /^\d{4}-\d{2}-\d{2}$/.test(input.visitOn) ? input.visitOn : indiaDay();
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
    .select("id, kind, body, status, category, created_at, image_url")
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
      kind: note.kind === "feedback" ? "Feedback" : "Complaint",
      category: String(note.category || "General"),
      body: String(note.body),
      photo: note.image_url ? String(note.image_url) : "",
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

export const REQUEST_CATEGORIES = [
  "Water",
  "Electricity",
  "Lift",
  "Plumbing",
  "Cleaning",
  "Security",
  "Parking",
  "Common areas",
  "Other",
];

const REQUEST_STATUS: Record<string, string> = {
  new: "Submitted",
  open: "Submitted",
  waiting: "Awaiting information",
  read: "Awaiting information",
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

async function loadPlannedBookings() {
  const today = indiaDay();
  const { loadAmenities } = await import("@/lib/office");
  const desk = await loadAmenities();
  return (desk.mine ?? [])
    .filter((row) => {
      const status = String(row.status || "").toLowerCase();
      if (status === "refused" || status === "cancelled" || status === "done") return false;
      return String(row.when || "") >= today;
    })
    .slice(0, 5);
}

export async function loadAttention() {
  const today = indiaDay();
  const [passes, requests, notices, notifications, bookings] = await Promise.all([
    loadPasses().then((value) => ({ ok: true as const, value })).catch(() => ({ ok: false as const, value: null })),
    loadRequests().then((value) => ({ ok: true as const, value })).catch(() => ({ ok: false as const, value: null })),
    loadNotices().then((value) => ({ ok: true as const, value })).catch(() => ({ ok: false as const, value: null })),
    loadNotifications().then((value) => ({ ok: true as const, value })).catch(() => ({ ok: false as const, value: null })),
    loadPlannedBookings()
      .then((value) => ({ ok: true as const, value }))
      .catch(() => ({ ok: false as const, value: [] as Awaited<ReturnType<typeof loadPlannedBookings>> })),
  ]);
  const allPasses = passes.ok ? passes.value.passes : [];
  const plannedVisitors = allPasses
    .filter((pass) =>
      (pass.raw === "expected" || pass.raw === "inside")
      && pass.date >= today
      && !pass.canDecide
      && !pass.atGate)
    .slice(0, 5)
    .sort((a, b) => a.date.localeCompare(b.date));
  return {
    incomplete: !passes.ok || !requests.ok || !notices.ok || !notifications.ok,
    waitingVisitors: allPasses.filter((pass) => pass.canDecide || pass.atGate),
    plannedVisitors,
    plannedBookings: bookings.ok ? bookings.value : [],
    waitingRequests: requests.ok ? requests.value.requests.filter((item) => item.status === "Awaiting information") : [],
    openRequests: requests.ok ? requests.value.requests.filter((item) => item.status !== "Resolved").slice(0, 3) : [],
    notices: notices.ok ? notices.value.slice(0, 3) : [],
    unread: notifications.ok ? notifications.value.filter((item) => !item.read) : [],
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
      kind: String(notice.kind),
      title: String(notice.title || "Notice"),
      body: String(notice.body || ""),
      date: when(String(notice.created_at)),
      at: String(notice.created_at),
      read: readError ? null : seen.has(notice.id as number),
    }));
}

const SERVICE_LINES = [
  { key: "water", label: "Water supply", pattern: /\bwater\b/i },
  { key: "electricity", label: "Electricity", pattern: /\b(electricity|electric|power)\b/i },
  { key: "lift", label: "Lift", pattern: /\b(lift|elevator)\b/i },
] as const;

export type ServiceLine = {
  key: (typeof SERVICE_LINES)[number]["key"]
  label: string
  published: boolean
  noticeId: number | null
  title: string | null
  summary: string | null
  updated: string | null
};

export function serviceSnapshot(notices: Awaited<ReturnType<typeof loadNotices>>) {
  const lines: ServiceLine[] = SERVICE_LINES.map((service) => {
    const match = notices
      .filter((notice) => service.pattern.test(htmlToPlain(`${notice.title} ${notice.body}`)))
      .sort((a, b) => b.at.localeCompare(a.at))[0];
    if (!match) {
      return {
        key: service.key,
        label: service.label,
        published: false,
        noticeId: null,
        title: null,
        summary: null,
        updated: null,
      };
    }
    return {
      key: service.key,
      label: service.label,
      published: true,
      noticeId: match.id,
      title: match.title,
      summary: match.body,
      updated: match.date,
    };
  });
  const newest = notices
    .filter((notice) => SERVICE_LINES.some((service) => service.pattern.test(htmlToPlain(`${notice.title} ${notice.body}`))))
    .sort((a, b) => b.at.localeCompare(a.at))[0];
  const updated = newest
    ? new Date(newest.at).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;
  return { lines, updated };
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
    body: String(item.body || ""),
    href: String(item.href || ""),
    read: Boolean(item.read_at),
    date: when(String(item.created_at)),
  }));
}

export async function markNotificationRead(id: number) {
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
}

export async function markAllNotificationsRead() {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Sign in again.");
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
  dbError(error, "Could not mark notifications as read.");
}

export function notificationPath(kind: string, href: string) {
  const value = `${kind} ${href}`.toLowerCase();
  const neighbour = href.match(/neighbour\/([A-Za-z0-9-]+)/i) || href.match(/members\?q=([A-Za-z0-9-]+)/i);
  if (neighbour) return `/(resident)/neighbour/${neighbour[1].toUpperCase()}`;
  if (value.includes("connect")) return "/(resident)/neighbours";
  const passId = href.match(/pass\/(\d+)/) || href.match(/visitors?\/(\d+)/);
  if (passId) return `/(resident)/pass/${passId[1]}`;
  if (value.includes("delivery")) return "/(resident)/notifications";
  if (value.includes("visitor") || value.includes("pass") || value.includes("history")) {
    return "/(resident)/history";
  }
  if (value.includes("registration") || value.includes("approved") || value.includes("approval")) {
    return value.includes("waiting") || value.includes("join") || value.includes("claim")
      ? "/(resident)/approvals"
      : "/(public)/join";
  }
  if (value.includes("account/requests") || value.includes("/account/requests")) {
    return "/(resident)/office-requests";
  }
  if (value.includes("notice") || value.includes("announce") || value.includes("meeting") || value.includes("maintenance")) {
    return "/(resident)/notices";
  }
  const post = href.match(/post\/(\d+)/);
  if (post && (value.includes("post") || value.includes("reply") || value.includes("feed") || value.includes("event") || value.includes("poll"))) {
    return `/(resident)/post/${post[1]}`;
  }
  if (value.includes("event")) return "/(resident)/events";
  if (value.includes("poll")) return "/(resident)/polls";
  if (value.includes("form")) return "/(resident)/forms";
  if (value.includes("booking") || value.includes("amenit")) return "/(resident)/amenities";
  if (value.includes("note_reply") || (value.includes("reply") && value.includes("request"))) {
    return "/(resident)/requests";
  }
  if (value.includes("reply") || value.includes("feed")) return "/(resident)/(tabs)/feed";
  if (value.includes("task") || value.includes("work") || value.includes("account/jobs")) return "/(staff)/(tabs)/tasks";
  if (value.includes("committee")) return "/(resident)/committee";
  if (value.includes("parking") || value.includes("vehicle")) return "/(resident)/parking";
  if (value.includes("request") || value.includes("note")) return "/(resident)/requests";
  return "/(resident)/notifications";
}

export async function answerArrival(passId: number, allow: boolean) {
  const { error } = await supabase.rpc("answer_arrival", { pass_id: passId, allow });
  dbError(error, "Could not send your answer.");
  const { flushPushOutbox } = await import("@/lib/pushFlush");
  await flushPushOutbox();
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
  const { flushPushOutbox } = await import("@/lib/pushFlush");
  await flushPushOutbox();
}

export async function loadGatePasses() {
  const today = indiaDay();
  const fields = "id, code, visitor_name, flat_number, purpose, status, visit_on";
  try {
    const [active, recentLeft] = await Promise.all([
      supabase
        .from("visitor_passes")
        .select(fields)
        .in("status", ["pending_approval", "waiting", "expected", "inside"])
        .order("created_at", { ascending: false }),
      supabase
        .from("visitor_passes")
        .select(fields)
        .eq("status", "left")
        .order("created_at", { ascending: false })
        .limit(12),
    ]);
    dbError(active.error, "Could not load the gate.");
    dbError(recentLeft.error, "Could not load the gate.");
    const rows = active.data ?? [];
    const result = {
      pending: rows.filter((row) => row.status === "pending_approval"),
      waiting: rows.filter((row) => row.status === "waiting"),
      expected: rows.filter((row) => row.status === "expected" && row.visit_on === today),
      inside: rows.filter((row) => row.status === "inside"),
      left: recentLeft.data ?? [],
      refused: [] as typeof rows,
      offline: false,
    };
    await SecureStore.setItemAsync(
      "rv_gate_cache_v1",
      JSON.stringify({
        at: Date.now(),
        expected: result.expected,
        pending: result.pending,
        waiting: result.waiting,
        inside: result.inside,
      }),
    ).catch(() => undefined);
    return result;
  } catch (error) {
    const cached = await SecureStore.getItemAsync("rv_gate_cache_v1").catch(() => null);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as {
          expected?: unknown[]
          pending?: unknown[]
          waiting?: unknown[]
          inside?: unknown[]
        };
        return {
          pending: (parsed.pending ?? []) as never[],
          waiting: (parsed.waiting ?? []) as never[],
          expected: (parsed.expected ?? []) as never[],
          inside: (parsed.inside ?? []) as never[],
          left: [],
          refused: [],
          offline: true,
        };
      } catch {
        /* fall through */
      }
    }
    throw error;
  }
}

export async function loadTasks() {
  const { data, error } = await supabase
    .from("work_orders")
    .select("id, title, place, body, status, created_at, assignee_role, assignee_user_id, frequency")
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
  const { data, error } = await supabase.rpc("record_delivery", {
    home: flatNumber.trim().toUpperCase(),
    label: label.trim(),
  });
  dbError(error, "Could not record the delivery.");
  const { flushPushOutbox } = await import("@/lib/pushFlush");
  await flushPushOutbox();
  if (data && typeof data === "object" && "notified" in data) {
    return Boolean((data as { notified?: boolean }).notified);
  }
  return true;
}
