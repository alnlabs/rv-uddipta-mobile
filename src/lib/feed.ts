import * as ImagePicker from "expo-image-picker";
import { supabase } from "@/lib/supabase";

export type Access = "none" | "view" | "manage";

export type BoardAccess = {
  feed: Access
  events: Access
  polls: Access
  forms: Access
};

export type PollOption = {
  id: number
  label: string
  votes: number
  mine: boolean
  share: number
};

export type FeedPost = {
  id: number
  kind: string
  label: string
  group: string
  body: string
  author: string
  flat: string | null
  who: string
  at: string
  date: string
  image: string | null
  startsOn: string | null
  startsLabel: string | null
  upcoming: boolean
  closed: boolean
  sold: boolean
  multiple: boolean
  mine: boolean
  canDelete: boolean
  canClose: boolean
  reported: boolean
  replies: number
  helpful: number
  thanks: number
  reaction: "helpful" | "thanks" | null
  going: boolean
  goingCount: number
  options: PollOption[]
  photo: boolean
  dated: boolean
};

export type Reply = {
  id: number
  author: string
  flat: string | null
  who: string
  body: string
  date: string
  mine: boolean
  canDelete: boolean
};

export type FormField = {
  id: number
  kind: "text" | "long" | "date" | "choice"
  label: string
  required: boolean
  choices: string[]
};

export type CommunityForm = {
  id: number
  title: string
  note: string
  closed: boolean
  results: string
  homes: number | null
  submitted: boolean
  phone: string
  fields: FormField[]
  answers: { fieldId: number; value: string }[]
};

const TYPES = [
  { value: "update", label: "Update", group: "talk", prompt: "What do you want to tell the community?", photo: false, dated: false },
  { value: "question", label: "Question", group: "talk", prompt: "What do you want to ask?", photo: false, dated: false },
  { value: "quote", label: "Quote", group: "talk", prompt: "Which line do you want to share?", photo: false, dated: false },
  { value: "celebration", label: "Celebration", group: "talk", prompt: "What are you celebrating?", photo: true, dated: true },
  { value: "sale", label: "For sale", group: "neighbours", prompt: "What are you selling, and for how much?", photo: true, dated: false },
  { value: "wanted", label: "Wanted", group: "neighbours", prompt: "What are you looking for?", photo: true, dated: false },
  { value: "giveaway", label: "Giveaway", group: "neighbours", prompt: "What are you giving away, and how can someone collect it?", photo: true, dated: false },
  { value: "lost", label: "Lost & found", group: "neighbours", prompt: "What was lost or found, and where?", photo: true, dated: false },
  { value: "recommendation", label: "Recommendation", group: "neighbours", prompt: "Who do you recommend, and what do they help with?", photo: true, dated: false },
  { value: "parking", label: "Parking", group: "neighbours", prompt: "Which slot, and for when?", photo: true, dated: false },
  { value: "event", label: "Event", group: "plans", prompt: "What is happening?", photo: true, dated: true },
  { value: "poll", label: "Poll", group: "plans", prompt: "What are you asking the community?", photo: false, dated: false },
  { value: "alert", label: "Alert", group: "plans", prompt: "What should neighbours know right now?", photo: false, dated: false },
] as const;

export const FEED_TYPES = TYPES.filter((item) => item.value !== "event" && item.value !== "poll" && item.value !== "celebration");
export const EVENT_TYPES = TYPES.filter((item) => item.value === "event" || item.value === "celebration");

export function postType(kind: string) {
  return TYPES.find((item) => item.value === kind) ?? {
    value: kind,
    label: kind === "emergency" ? "Emergency" : "Update",
    group: kind === "emergency" ? "emergency" : "talk",
    prompt: "What do you want to tell the community?",
    photo: kind === "emergency",
    dated: false,
  };
}

function dbError(error: { message: string } | null, fallback: string) {
  if (!error) return;
  const message = error.message || fallback;
  if (/network|fetch|offline|failed to fetch/i.test(message)) {
    throw new Error("You are offline. Try again when the connection is back.");
  }
  if (/schema cache|could not find the function|community_board|list_my_forms/i.test(message)) {
    throw new Error("This needs the latest database update. Run the database push in the portal, then try again.");
  }
  throw new Error(message);
}

function text(value: unknown) {
  return value == null ? "" : String(value);
}

function todayKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function dateLabel(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function when(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function accessOf(value: unknown): Access {
  return value === "manage" || value === "view" ? value : "none";
}

function mapPost(raw: Record<string, unknown>): FeedPost {
  const kind = text(raw.kind) || "update";
  const type = postType(kind);
  const startsOn = raw.startsOn ? text(raw.startsOn).slice(0, 10) : null;
  const options = Array.isArray(raw.options)
    ? raw.options.map((item) => {
        const option = item as Record<string, unknown>;
        return {
          id: Number(option.id),
          label: text(option.label),
          votes: Number(option.votes || 0),
          mine: Boolean(option.mine),
          share: 0,
        };
      })
    : [];
  const total = options.reduce((sum, option) => sum + option.votes, 0);
  const reaction = raw.reaction === "helpful" || raw.reaction === "thanks" ? raw.reaction : null;
  return {
    id: Number(raw.id),
    kind,
    label: type.label,
    group: type.group,
    body: text(raw.body),
    author: text(raw.author),
    flat: raw.flat ? text(raw.flat) : null,
    who: raw.flat ? `${text(raw.author)} · ${text(raw.flat)}` : text(raw.author),
    at: text(raw.at),
    date: when(text(raw.at)),
    image: raw.image ? text(raw.image) : null,
    startsOn,
    startsLabel: dateLabel(startsOn),
    upcoming: !startsOn || startsOn >= todayKey(),
    closed: Boolean(raw.closed),
    sold: Boolean(raw.sold),
    multiple: Boolean(raw.multiple),
    mine: Boolean(raw.mine),
    canDelete: Boolean(raw.canDelete),
    canClose: Boolean(raw.canClose),
    reported: Boolean(raw.reported),
    replies: Number(raw.replies || 0),
    helpful: Number(raw.helpful || 0),
    thanks: Number(raw.thanks || 0),
    reaction,
    going: Boolean(raw.going),
    goingCount: Number(raw.goingCount || 0),
    options: options.map((option) => ({
      ...option,
      share: total ? Math.round((option.votes / total) * 100) : 0,
    })),
    photo: type.photo,
    dated: type.dated,
  };
}

function mapReply(raw: Record<string, unknown>): Reply {
  return {
    id: Number(raw.id),
    author: text(raw.author),
    flat: raw.flat ? text(raw.flat) : null,
    who: raw.flat ? `${text(raw.author)} · ${text(raw.flat)}` : text(raw.author),
    body: text(raw.body),
    date: when(text(raw.at)),
    mine: Boolean(raw.mine),
    canDelete: Boolean(raw.canDelete),
  };
}

export async function loadBoard() {
  const { data, error } = await supabase.rpc("community_board");
  dbError(error, "Could not load the community.");
  const board = (data ?? {}) as Record<string, unknown>;
  const access = (board.access ?? {}) as Record<string, unknown>;
  const posts = Array.isArray(board.posts) ? board.posts.map((item) => mapPost(item as Record<string, unknown>)) : [];
  return {
    access: {
      feed: accessOf(access.feed),
      events: accessOf(access.events),
      polls: accessOf(access.polls),
      forms: accessOf(access.forms),
    } satisfies BoardAccess,
    posts,
  };
}

export async function loadThread(id: number) {
  const { data, error } = await supabase.rpc("post_thread", { target: id });
  dbError(error, "Could not load that post.");
  const payload = (data ?? {}) as Record<string, unknown>;
  const access = (payload.access ?? {}) as Record<string, unknown>;
  const post = mapPost((payload.post ?? {}) as Record<string, unknown>);
  const thread = Array.isArray((payload.post as Record<string, unknown> | undefined)?.thread)
    ? ((payload.post as Record<string, unknown>).thread as Record<string, unknown>[]).map(mapReply)
    : [];
  return {
    access: {
      feed: accessOf(access.feed),
      events: accessOf(access.events),
      polls: accessOf(access.polls),
      forms: accessOf(access.forms),
    } satisfies BoardAccess,
    post,
    replies: thread,
  };
}

export async function createPost(input: {
  kind: string
  message: string
  eventOn?: string | null
  choices?: string[]
  multiple?: boolean
  photo?: { uri: string; mime: string } | null
}) {
  const { data, error } = await supabase.rpc("create_my_post", {
    kind: input.kind,
    message: input.message,
    event_on: input.eventOn || null,
    choices: input.choices ?? null,
    allow_multiple: Boolean(input.multiple),
  });
  dbError(error, "Could not post. Try again.");
  const id = Number(data);
  if (!id) throw new Error("Could not post. Try again.");
  if (input.photo) {
    try {
      await savePostPhoto(id, input.photo.uri, input.photo.mime);
    } catch (error) {
      const note = error instanceof Error ? error.message : "Could not save the photo.";
      const { error: deleteError } = await supabase.rpc("delete_my_post", { target: id });
      if (deleteError) throw new Error(`${note} The post is still there without the photo.`);
      throw new Error(`${note} The post was not kept.`);
    }
  }
  return id;
}

export async function editPost(id: number, message: string, eventOn?: string | null, photo?: { uri: string; mime: string } | null) {
  const { error } = await supabase.rpc("edit_my_post", {
    target: id,
    message,
    event_on: eventOn || null,
  });
  dbError(error, "Could not save that.");
  if (!photo) return;
  await savePostPhoto(id, photo.uri, photo.mime);
}

export async function removePost(id: number) {
  const { error } = await supabase.rpc("delete_my_post", { target: id });
  dbError(error, "Could not delete that.");
}

export async function replyToPost(id: number, message: string) {
  const { error } = await supabase.rpc("reply_to_post", { target: id, message });
  dbError(error, "Could not reply. Try again.");
}

export async function removeReply(id: number) {
  const { error } = await supabase.rpc("delete_my_reply", { target: id });
  dbError(error, "Could not delete that reply.");
}

export async function reactToPost(id: number, kind: "helpful" | "thanks") {
  const { error } = await supabase.rpc("react_to_post", { target: id, reaction_kind: kind });
  dbError(error, "Could not save that reaction.");
}

export async function rsvpEvent(id: number) {
  const { data, error } = await supabase.rpc("rsvp_my_event", { target: id });
  dbError(error, "Could not save your RSVP.");
  return data === "going" ? "You are going." : "RSVP removed.";
}

export async function votePoll(id: number, choiceId: number) {
  const { error } = await supabase.rpc("vote_my_poll", { target: id, choice_id: choiceId });
  dbError(error, "Could not save your vote. Try again.");
}

export async function closePoll(id: number) {
  const { error } = await supabase.rpc("close_my_poll", { target: id });
  dbError(error, "Could not close the poll.");
}

export async function reportPost(id: number, reason: string) {
  const { error } = await supabase.rpc("report_my_post", { target: id, reason });
  dbError(error, "Could not save the report.");
}

async function savePostPhoto(postId: number, uri: string, mime: string) {
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const contentType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  const response = await fetch(uri);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > 5 * 1024 * 1024) throw new Error("Photo must be 5 MB or smaller.");
  if (bytes.byteLength < 32) throw new Error("Could not read that photo.");
  const path = `posts/${postId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("post-photos").upload(path, bytes, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error("Could not save the photo. Try again.");
  const { data } = supabase.storage.from("post-photos").getPublicUrl(path);
  const { error: attachError } = await supabase.rpc("attach_my_post_photo", {
    target: postId,
    image_url: data.publicUrl,
  });
  dbError(attachError, "Could not save the photo.");
}

export async function pickPostPhoto() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error("Allow photo access to add a picture.");
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.8,
  });
  if (picked.canceled || !picked.assets[0]) return null;
  const asset = picked.assets[0];
  if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
    throw new Error("Photo must be 5 MB or smaller.");
  }
  return { uri: asset.uri, mime: asset.mimeType || "image/jpeg" };
}

function mapField(raw: Record<string, unknown>): FormField {
  const kind = raw.kind === "long" || raw.kind === "date" || raw.kind === "choice" ? raw.kind : "text";
  const choices = Array.isArray(raw.choices) ? raw.choices.map((choice) => text(choice)).filter(Boolean) : [];
  return {
    id: Number(raw.id),
    kind,
    label: text(raw.label),
    required: Boolean(raw.required),
    choices,
  };
}

export async function loadForms() {
  const { data, error } = await supabase.rpc("list_my_forms");
  dbError(error, "Could not load forms.");
  const payload = (data ?? {}) as Record<string, unknown>;
  const forms = Array.isArray(payload.forms)
    ? payload.forms.map((item) => {
        const form = item as Record<string, unknown>;
        return {
          id: Number(form.id),
          title: text(form.title),
          note: text(form.note),
          closed: Boolean(form.closed),
          results: text(form.results),
          homes: form.homes == null ? null : Number(form.homes),
          submitted: Boolean(form.submitted),
          phone: text(form.phone),
          fields: Array.isArray(form.fields) ? form.fields.map((field) => mapField(field as Record<string, unknown>)) : [],
          answers: Array.isArray(form.answers)
            ? form.answers.map((answer) => {
                const row = answer as Record<string, unknown>;
                return { fieldId: Number(row.fieldId), value: text(row.value) };
              })
            : [],
        } satisfies CommunityForm;
      })
    : [];
  return {
    access: accessOf(payload.access),
    flat: payload.flat ? text(payload.flat) : null,
    forms,
  };
}

export async function submitForm(id: number, phone: string, answers: { fieldId: number; value: string }[]) {
  const { data, error } = await supabase.rpc("submit_my_form", {
    form_id: id,
    contact: phone,
    answers,
  });
  dbError(error, "Could not send that.");
  return data === "updated"
    ? "Your earlier answer for this flat was updated."
    : "Sent.";
}
