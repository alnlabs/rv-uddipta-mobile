import { supabase } from "@/lib/supabase";

function dbError(error: { message: string } | null, fallback: string) {
  if (!error) return;
  throw new Error(error.message || fallback);
}

async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name, args);
  dbError(error, "Could not load that.");
  return data as T;
}

export async function loadRegistration() {
  return rpc<{
    flatNumber: string | null
    role: string
    name: string
    request: null | {
      status: "pending" | "approved" | "rejected"
      flatNumber: string | null
      kind: string
      path?: string
      whyNote?: string
      reason: string
    }
  }>("load_my_registration");
}

export async function submitRegistration(input: {
  kind: string
  phone: string
  ownerName: string
  flatNumber?: string
  whyNote: string
}) {
  return rpc<{
    ok: boolean
    status: string
    flatNumber: string | null
    kind?: string
    path?: string
    message: string
  }>("submit_registration", {
    kind: input.kind,
    phone: input.phone,
    owner_name: input.ownerName,
    flat_number: input.flatNumber || "",
    why_note: input.whyNote,
  });
}

export async function chooseBrowse() {
  const { error } = await supabase.auth.updateUser({
    data: { joinIntent: "browse", registrationStatus: "browse" },
  });
  dbError(error, "Could not open public pages.");
  await supabase.auth.refreshSession();
  return { ok: true as const, status: "browse" as const };
}

export type AmenityBooking = {
  id: number
  amenityId: number
  home: string
  who?: string
  when: string
  slot: string
  status: string
  space: string
  overdue?: boolean
};

export async function loadAmenities() {
  const data = await rpc<{
    canBook: boolean
    canDecide?: boolean
    slots: { value: string; label: string }[]
    amenities: { id: number; name: string; hours: string }[]
    pending?: AmenityBooking[]
    mine: AmenityBooking[]
  }>("list_amenities_desk");
  return {
    ...data,
    canDecide: Boolean(data.canDecide),
    pending: data.pending ?? [],
  };
}

export async function bookAmenity(input: { amenityId: number; startsOn: string; slot: string }) {
  return rpc<{ ok: boolean; message: string }>("book_amenity", {
    amenity_id: input.amenityId,
    starts_on: input.startsOn,
    slot: input.slot,
  });
}

export async function decideBooking(input: { bookingId: number; status: "confirmed" | "refused" }) {
  return rpc<{ ok: boolean; message: string }>("decide_booking", {
    booking_id: input.bookingId,
    next_status: input.status,
  });
}

export async function saveAmenityHours(input: { amenityId: number; hours: string }) {
  return rpc<{ ok: boolean; message: string }>("save_amenity_hours", {
    amenity_id: input.amenityId,
    hours: input.hours,
  });
}

export async function loadParking() {
  return rpc<{
    canManage: boolean
    home: string | null
    vehicles: { id: number; plate: string; label: string }[]
    bays: { id: number; label: string; kind: string; home: string | null }[]
  }>("list_my_parking");
}

export async function saveVehicle(input: { plate: string; label: string }) {
  return rpc<{ ok: boolean; message?: string }>("save_my_vehicle", {
    plate: input.plate,
    label: input.label,
  });
}

export async function removeVehicle(vehicleId: number) {
  return rpc<{ ok: boolean }>("remove_my_vehicle", { vehicle_id: vehicleId });
}

export type NeighbourPerson = { name: string; photoUrl?: string | null; role?: string };
export type NeighbourRenter = {
  name: string
  phone: string
  startDate?: string | null
  endDate?: string | null
  current?: boolean
};

export type NeighbourHome = {
  home: string
  flatId?: number
  wing: string
  floor: number
  type: string
  facing?: string
  area?: number | null
  owner: string
  photo?: string
  email?: string
  phone: string
  tenant: string
  tenantPhone: string
  occupancy?: string
  family?: NeighbourPerson[]
  renters?: NeighbourRenter[]
  people?: NeighbourPerson[]
  connection?: string | null
  requestId?: number | null
  mine?: boolean
  registered?: boolean
  canCall?: boolean
};

function maskPhone(phone: string | null | undefined) {
  const value = String(phone || "").replace(/\D/g, "");
  if (!value) return "";
  if (value.length < 4) return "****";
  return `${value.slice(0, 2)}******${value.slice(-2)}`;
}

function sameHome(a?: string | null, b?: string | null) {
  if (!a || !b) return false;
  return a.trim().toUpperCase() === b.trim().toUpperCase();
}

async function loadFlatDetails(home: NeighbourHome): Promise<NeighbourHome> {
  let query = supabase
    .from("flats_public")
    .select("id, flat_number, wing, floor, type, facing, area_sqft, owner_name, owner_photo_url, email, phone_masked, tenant_name, tenant_phone_masked, occupancy");
  if (home.flatId) query = query.eq("id", home.flatId);
  else query = query.ilike("flat_number", home.home.replace(/[%_]/g, ""));
  const { data: row } = await query.maybeSingle();
  if (!row) return home;

  const flatId = Number(row.id);
  const [{ data: members }, { data: renters }] = await Promise.all([
    supabase.from("flat_members").select("name, photo_url").eq("flat_id", flatId).order("id"),
    supabase.from("flat_renters").select("name, phone, start_date, end_date").eq("flat_id", flatId).order("id"),
  ]);

  return {
    ...home,
    flatId,
    home: String(row.flat_number || home.home),
    wing: String(row.wing || home.wing || ""),
    floor: Number(row.floor ?? home.floor ?? 0),
    type: String(row.type || home.type || ""),
    facing: String(row.facing || ""),
    area: row.area_sqft == null ? null : Number(row.area_sqft),
    owner: String(row.owner_name || home.owner || ""),
    photo: row.owner_photo_url ? String(row.owner_photo_url) : home.photo || "",
    email: row.email ? String(row.email) : "",
    phone: String(row.phone_masked || ""),
    tenant: String(row.tenant_name || ""),
    tenantPhone: String(row.tenant_phone_masked || ""),
    occupancy: String(row.occupancy || home.occupancy || ""),
    family: (members ?? [])
      .map((person) => ({
        name: String(person.name || ""),
        photoUrl: person.photo_url ? String(person.photo_url) : null,
      }))
      .filter((person) => person.name),
    renters: (renters ?? [])
      .map((person) => {
        const endDate = person.end_date ? String(person.end_date).slice(0, 10) : null;
        return {
          name: String(person.name || ""),
          phone: maskPhone(person.phone),
          startDate: person.start_date ? String(person.start_date).slice(0, 10) : null,
          endDate,
          current: !endDate,
        };
      })
      .filter((person) => person.name),
    people: home.people ?? [],
  };
}

function summaryHome(home: NeighbourHome): NeighbourHome {
  return {
    ...home,
    facing: "",
    area: null,
    email: "",
    phone: "",
    tenant: "",
    tenantPhone: "",
    family: [],
    renters: [],
    people: [],
  };
}

export async function loadNeighbours(q = "") {
  const data = await rpc<{ flat: string | null; homes: NeighbourHome[] }>("list_neighbours", {
    q: q.trim(),
  });
  return {
    flat: data.flat,
    homes: data.homes ?? [],
  };
}

export async function loadNeighbour(homeKey: string, flatId?: number) {
  const key = homeKey.trim();
  const listed = await loadNeighbours(key);
  const found = (listed.homes ?? []).find((row) =>
    (flatId && row.flatId === flatId) || sameHome(row.home, key),
  );
  if (!found) throw new Error("That home is not in the directory.");
  const detail = found.registered || found.mine
    ? await loadFlatDetails(found).catch(() => found)
    : summaryHome(found);

  let incoming = false;
  let connection: string | null = detail.connection ?? null;
  let requestId: number | null = detail.requestId ?? null;
  let canCall = Boolean(detail.canCall);
  if (detail.flatId) {
    try {
      const { neighbourLink } = await import("@/lib/call");
      const link = await neighbourLink(detail.flatId);
      connection = link.status;
      requestId = link.requestId;
      incoming = Boolean(link.incoming);
      canCall = Boolean(link.canCall);
    } catch {
      /* RPC missing until migration is pushed */
    }
  }

  return {
    flat: listed.flat,
    incoming,
    home: {
      ...detail,
      connection,
      requestId,
      canCall,
    },
  };
}

export async function connectNeighbour(input: {
  home: string
  note?: string
  action?: "connect" | "accept" | "refuse"
  requestId?: number
}) {
  const result = await rpc<{ message: string; status?: string; requestId?: number; incoming?: boolean }>(
    "request_connection",
    {
      action: input.action || "connect",
      target_home: input.home,
      note: input.note || "",
      request_id: input.requestId ?? null,
    },
  );
  const { flushPushOutbox } = await import("@/lib/pushFlush");
  await flushPushOutbox();
  return result;
}

export type ApprovalRequest = {
  id: number
  home: string
  name: string
  email: string
  phone: string
  kind: string
  path?: string
  whyNote?: string
  createdAt: string
};

export async function loadApprovals() {
  return rpc<{ waiting: ApprovalRequest[] }>("list_waiting_approvals");
}

export async function decideApproval(input: {
  id: number
  action: "approve" | "reject"
  reason?: string
}) {
  return rpc<{ message: string; status?: string }>("decide_registration", {
    request_id: input.id,
    next_action: input.action,
    reason: input.reason || "",
  });
}

export type OfficeRequest = {
  id: number
  kind: string
  who: string
  home: string
  body: string
  status: string
  statusLabel: string
  date: string
  imageUrl: string
  assigneeId: string | null
  assigneeName: string | null
  jobId: number | null
  messages: { id: number; who: string; body: string; fromOffice: boolean }[]
};

export async function loadOfficeRequests(kind: "request" | "feedback" = "request") {
  return rpc<{
    canManage: boolean
    canOpenJob: boolean
    kind: string
    people: { id: string; name: string }[]
    requests: OfficeRequest[]
  }>("list_office_requests", { note_kind: kind });
}

export async function officeRequestAction(input: {
  action: "reply" | "status" | "assign" | "job"
  noteId: number
  reply?: string
  status?: "new" | "in_progress" | "waiting" | "done"
  assignee?: string
  title?: string
  place?: string
  body?: string
}) {
  return rpc<{ message: string }>("office_request_action", {
    action: input.action,
    note_id: input.noteId,
    reply: input.reply ?? null,
    next_status: input.status ?? null,
    assignee: input.assignee ?? null,
    title: input.title ?? null,
    place: input.place ?? null,
    body: input.body ?? null,
  });
}

export async function publishNotice(input: {
  kind: "announcement" | "maintenance" | "meeting"
  title: string
  body?: string
  startsOn?: string
  pin?: boolean
}) {
  return rpc<{ ok: boolean; id?: number; message: string }>("publish_notice", {
    kind: input.kind,
    title: input.title,
    body: input.body || "",
    starts_on: input.startsOn || null,
    pin: Boolean(input.pin),
  });
}

export type DeskJob = {
  id: number
  title: string
  place: string
  body: string
  status: string
  state: string
  assigneeId?: string | null
  assigneeRole?: string | null
  frequency?: string | null
  frequencyLabel?: string | null
  who: string
};

export const TASK_ROLES = [
  { value: "staff", label: "Staff" },
  { value: "facility", label: "Facility" },
  { value: "security", label: "Security" },
] as const;

export const TASK_FREQUENCIES = [
  { value: "once", label: "Once" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
] as const;

export function frequencyLabel(value: string | null | undefined) {
  return TASK_FREQUENCIES.find((item) => item.value === value)?.label || "Once";
}

export type OfficeDeskSummary = {
  approvals: number
  requests: number
  bookings: number
  openJobs: number
};

export async function loadOfficeDeskSummary(options: {
  admin: boolean
  facility: boolean
}): Promise<OfficeDeskSummary> {
  const summary: OfficeDeskSummary = { approvals: 0, requests: 0, bookings: 0, openJobs: 0 };
  const tasks: Promise<void>[] = [];
  if (options.admin) {
    tasks.push(
      loadApprovals()
        .then((data) => { summary.approvals = data.waiting.length; })
        .catch(() => undefined),
    );
    tasks.push(
      loadOfficeRequests("request")
        .then((data) => { summary.requests = data.requests.filter((row) => row.status !== "done").length; })
        .catch(() => undefined),
    );
  }
  if (options.facility) {
    tasks.push(
      loadAmenities()
        .then((data) => { summary.bookings = data.canDecide ? data.pending.length : 0; })
        .catch(() => undefined),
    );
    tasks.push(
      loadJobs()
        .then((data) => { summary.openJobs = data.jobs.filter((job) => job.state !== "done").length; })
        .catch(() => undefined),
    );
  }
  await Promise.all(tasks);
  return summary;
}

export async function loadJobs() {
  return rpc<{
    canManage: boolean
    people: { id: string; name: string; onDuty: boolean }[]
    jobs: DeskJob[]
  }>("list_jobs_desk");
}

export type AttendancePerson = {
  id: string
  name: string
  role: string
  roleLabel: string
  onDuty: boolean
  status: "present" | "absent" | null
  markedAt?: string | null
};

export async function loadStaffAttendance(dutyOn?: string) {
  const data = await rpc<{
    dutyOn: string
    canMark: boolean
    people: AttendancePerson[]
  }>("list_staff_attendance", dutyOn ? { duty_on: dutyOn } : {});
  return {
    dutyOn: String(data?.dutyOn || ""),
    canMark: Boolean(data?.canMark),
    people: Array.isArray(data?.people)
      ? data.people.map((person) => ({
        id: String(person.id),
        name: String(person.name || "Staff"),
        role: String(person.role || ""),
        roleLabel: String(person.roleLabel || person.role || "Staff"),
        onDuty: Boolean(person.onDuty),
        status: person.status === "present" || person.status === "absent" ? person.status : null,
        markedAt: person.markedAt ? String(person.markedAt) : null,
      }))
      : [],
  };
}

export async function markStaffAttendance(input: {
  personId: string
  status: "present" | "absent"
  dutyOn?: string
}) {
  return rpc<{ ok: boolean; message?: string; status?: string }>("mark_staff_attendance", {
    person_id: input.personId,
    status: input.status,
    ...(input.dutyOn ? { duty_on: input.dutyOn } : {}),
  });
}

export async function setOnDuty(input: { personId: string; onDuty: boolean }) {
  return rpc<{ ok: boolean; message?: string }>("set_on_duty", {
    person_id: input.personId,
    on_duty: input.onDuty,
  });
}

export async function openJob(input: {
  title: string
  place?: string
  body?: string
  role?: string | null
  frequency?: string | null
}) {
  return rpc<{ ok: boolean; message?: string }>("open_job", {
    title: input.title,
    place: input.place || "",
    body: input.body || "",
    target_role: input.role || null,
    frequency: input.frequency || "once",
  });
}

export async function updateJob(input: {
  jobId: number
  title?: string
  place?: string
  body?: string
  role?: string | null
  frequency?: string | null
  clearPerson?: boolean
}) {
  return rpc<{ ok: boolean; message?: string }>("update_job", {
    job_id: input.jobId,
    title: input.title ?? null,
    place: input.place ?? null,
    body: input.body ?? null,
    target_role: input.role === undefined ? null : input.role,
    clear_person: Boolean(input.clearPerson),
    frequency: input.frequency ?? null,
  });
}

export async function assignJob(input: {
  jobId: number
  assignee?: string
  status?: "open" | "in_progress" | "done"
  role?: string | null
}) {
  return rpc<{ ok: boolean; message?: string }>("assign_job", {
    job_id: input.jobId,
    assignee: input.assignee ?? null,
    next_status: input.status ?? null,
    target_role: input.role || null,
  });
}

export async function loadCommittee() {
  return rpc<{
    canManage: boolean
    items: {
      id: number
      title: string
      body: string
      kind: string
      status: string
      decision: string
    }[]
  }>("list_committee_desk");
}

export async function decideCommittee(input: {
  itemId: number
  title: string
  body: string
  kind: string
  decision: string
}) {
  return rpc<{ ok: boolean }>("decide_committee", {
    item_id: input.itemId,
    title: input.title,
    body: input.body,
    kind: input.kind,
    decision: input.decision,
  });
}

export async function createCommitteeItem(input: {
  title: string
  body: string
  kind: string
}) {
  return decideCommittee({
    itemId: 0,
    title: input.title,
    body: input.body,
    kind: input.kind,
    decision: "",
  });
}

export async function walkInVisitor(input: {
  visitorName: string
  flatNumber: string
  purpose: string
}) {
  const result = await rpc<{ code: string }>("gate_walk_in", {
    visitor_name: input.visitorName,
    flat_number: input.flatNumber,
    purpose: input.purpose,
  });
  const { flushPushOutbox } = await import("@/lib/pushFlush");
  await flushPushOutbox();
  return result;
}
