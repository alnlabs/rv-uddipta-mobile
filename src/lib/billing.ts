import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "@/lib/supabase";

function dbError(error: { message?: string } | null, fallback: string) {
  if (error) throw new Error(error.message || fallback);
}

export type DueInvoice = {
  id: number
  period: string
  title: string
  status: string
  amountPaise: number
  balancePaise: number
  dueOn: string | null
  home: string
};

export type DuePayment = {
  id: number
  amountPaise: number
  method: string
  reference: string | null
  status: string
  at: string
  invoiceId: number | null
  proofPath: string | null
  proofUrl: string | null
};

export function formatRupees(paise: number) {
  return (paise / 100).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

export async function loadMyDues() {
  const { data, error } = await supabase.rpc("list_my_dues");
  dbError(error, "Could not load dues.");
  const payload = (data ?? {}) as Record<string, unknown>;
  const invoices = Array.isArray(payload.invoices) ? payload.invoices : [];
  const payments = Array.isArray(payload.payments) ? payload.payments : [];
  return {
    flat: payload.flat ? String(payload.flat) : null,
    invoices: invoices.map((row) => {
      const item = row as Record<string, unknown>;
      return {
        id: Number(item.id),
        period: String(item.period || ""),
        title: String(item.title || ""),
        status: String(item.status || ""),
        amountPaise: Number(item.amountPaise || 0),
        balancePaise: Number(item.balancePaise || 0),
        dueOn: item.dueOn ? String(item.dueOn) : null,
        home: String(item.home || ""),
      } satisfies DueInvoice;
    }),
    payments: payments.map((row) => {
      const item = row as Record<string, unknown>;
      return {
        id: Number(item.id),
        amountPaise: Number(item.amountPaise || 0),
        method: String(item.method || ""),
        reference: item.reference ? String(item.reference) : null,
        status: String(item.status || ""),
        at: String(item.at || ""),
        invoiceId: item.invoiceId == null ? null : Number(item.invoiceId),
        proofPath: item.proofPath ? String(item.proofPath) : null,
        proofUrl: item.proofUrl ? String(item.proofUrl) : null,
      } satisfies DuePayment;
    }),
  };
}

export async function signedProofUrl(path: string | null | undefined) {
  if (!path) return null;
  const { data, error } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

async function uploadProofFile(input: {
  flatId: number
  uri: string
  mime: string
  name?: string
}) {
  const mime = input.mime || "image/jpeg";
  const ext =
    mime === "application/pdf" ? "pdf"
      : mime === "image/png" ? "png"
        : mime === "image/webp" ? "webp"
          : "jpg";
  const response = await fetch(input.uri);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > 8 * 1024 * 1024) throw new Error("Proof must be 8 MB or smaller.");
  if (bytes.byteLength < 32) throw new Error("Could not read that file.");
  const path = `${input.flatId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("payment-proofs").upload(path, bytes, {
    contentType: mime,
    upsert: false,
  });
  if (error) throw new Error(error.message || "Could not upload the proof.");
  return path;
}

export async function pickProofFile() {
  // Prefer document picker so residents can attach a PDF or an image.
  try {
    const doc = await DocumentPicker.getDocumentAsync({
      type: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (!doc.canceled && doc.assets?.[0]) {
      const asset = doc.assets[0];
      if (asset.size && asset.size > 8 * 1024 * 1024) {
        throw new Error("Proof must be 8 MB or smaller.");
      }
      return {
        uri: asset.uri,
        mime: asset.mimeType || "application/octet-stream",
        name: asset.name || "proof",
      };
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("8 MB")) throw error;
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error("Allow photo access to attach a screenshot.");
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.85,
  });
  if (picked.canceled || !picked.assets[0]) return null;
  const asset = picked.assets[0];
  if (asset.fileSize && asset.fileSize > 8 * 1024 * 1024) {
    throw new Error("Proof must be 8 MB or smaller.");
  }
  return {
    uri: asset.uri,
    mime: asset.mimeType || "image/jpeg",
    name: asset.fileName || "screenshot.jpg",
  };
}

export async function submitPaymentProof(input: {
  invoiceId: number
  amountPaise: number
  method?: string
  reference?: string
  proof: { uri: string; mime: string; name?: string }
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in first.");
  const { data: account, error: accountError } = await supabase
    .from("profiles")
    .select("flat_id")
    .eq("user_id", user.id)
    .maybeSingle();
  dbError(accountError, "Could not load your home.");
  let flatId = Number(account?.flat_id || 0);
  if (!flatId) {
    const { data: held } = await supabase
      .from("person_roles")
      .select("flat_id, role")
      .eq("user_id", user.id);
    const homeHeld = (held ?? []).find(
      (row) =>
        row.flat_id
        && (row.role === "owner" || row.role === "co_owner" || row.role === "tenant"),
    );
    if (homeHeld?.flat_id) flatId = Number(homeHeld.flat_id);
  }
  if (!flatId) {
    const { data: owned } = await supabase
      .from("flats")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (owned?.id) flatId = Number(owned.id);
  }
  if (!flatId) throw new Error("Link a home first.");

  const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowed.includes(input.proof.mime)) {
    throw new Error("Use a JPEG, PNG, WebP screenshot, or a PDF.");
  }

  const proofPath = await uploadProofFile({
    flatId,
    uri: input.proof.uri,
    mime: input.proof.mime,
    name: input.proof.name,
  });

  const { error } = await supabase.rpc("submit_my_payment_proof", {
    invoice_id: input.invoiceId,
    amount_paise: input.amountPaise,
    proof_path: proofPath,
    method: input.method || "upi",
    reference: input.reference || null,
  });
  dbError(error, "Could not submit payment proof.");
}
