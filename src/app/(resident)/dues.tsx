import { useCallback, useState } from "react";
import { Linking, Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Empty, SectionLabel } from "@/components/Blocks";
import { Note, Screen } from "@/components/Screen";
import {
  formatRupees,
  loadMyDues,
  pickProofFile,
  signedProofUrl,
  submitPaymentProof,
  type DueInvoice,
  type DuePayment,
} from "@/lib/billing";
import { colors, ui } from "@/theme";

export default function DuesScreen() {
  const [invoices, setInvoices] = useState<DueInvoice[]>([]);
  const [payments, setPayments] = useState<DuePayment[]>([]);
  const [proofLinks, setProofLinks] = useState<Record<number, string>>({});
  const [home, setHome] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [references, setReferences] = useState<Record<number, string>>({});
  const [picked, setPicked] = useState<Record<number, { uri: string; mime: string; name?: string } | null>>({});

  const load = useCallback(async () => {
    try {
      const data = await loadMyDues();
      setInvoices(data.invoices);
      setPayments(data.payments);
      setHome(data.flat);
      const links: Record<number, string> = {};
      await Promise.all(
        data.payments.map(async (payment) => {
          const url = await signedProofUrl(payment.proofPath);
          if (url) links[payment.id] = url;
        }),
      );
      setProofLinks(links);
      setAmounts((current) => {
        const next = { ...current };
        for (const invoice of data.invoices) {
          if (next[invoice.id] == null) next[invoice.id] = String(invoice.balancePaise / 100);
        }
        return next;
      });
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load dues.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const open = invoices.filter((row) => row.status === "open" || row.status === "partial");
  const closed = invoices.filter((row) => row.status === "paid");

  async function chooseProof(invoiceId: number) {
    try {
      const file = await pickProofFile();
      if (!file) return;
      setPicked((current) => ({ ...current, [invoiceId]: file }));
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not attach proof.");
    }
  }

  async function submit(invoice: DueInvoice) {
    if (savingId) return;
    const rupees = Number(String(amounts[invoice.id] || "").replace(/,/g, ""));
    const proof = picked[invoice.id];
    if (!Number.isFinite(rupees) || rupees <= 0) {
      setMessage("Enter the amount you paid.");
      return;
    }
    if (!proof) {
      setMessage("Attach a screenshot or PDF proof first.");
      return;
    }
    setSavingId(invoice.id);
    setMessage("");
    try {
      await submitPaymentProof({
        invoiceId: invoice.id,
        amountPaise: Math.round(rupees * 100),
        method: "upi",
        reference: (references[invoice.id] || "").trim() || undefined,
        proof,
      });
      setPicked((current) => ({ ...current, [invoice.id]: null }));
      setMessage("Proof submitted. The office will confirm it into the ledger.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not submit proof.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Screen title="Dues" onRefresh={load} busy={!ready && !message}>
      <Text style={ui.body}>
        {home
          ? `Invoices for ${home}. Pay outside the app, then upload a screenshot or PDF as proof. The office confirms it — there is no in-app payment.`
          : "Link a flat to see society dues."}
      </Text>
      {message ? (
        <Note
          text={message}
          tone={message.includes("submitted") || message.includes("confirm") ? "ok" : "error"}
        />
      ) : null}

      <SectionLabel title="Open" />
      {ready && open.length === 0 ? <Empty title="No open dues" detail="When the office posts a billing cycle, it appears here." /> : null}
      {open.map((invoice) => (
        <View key={invoice.id} style={ui.card}>
          <Text style={ui.label}>{invoice.status} · {invoice.period}</Text>
          <Text style={ui.cardTitle}>{invoice.title}</Text>
          <Text style={ui.body}>
            {formatRupees(invoice.amountPaise)} · balance {formatRupees(invoice.balancePaise)}
          </Text>
          {invoice.dueOn ? <Text style={ui.meta}>Due {invoice.dueOn}</Text> : null}

          <Text style={ui.label}>Submit proof</Text>
          <TextInput
            value={amounts[invoice.id] || ""}
            onChangeText={(value) => setAmounts((current) => ({ ...current, [invoice.id]: value }))}
            keyboardType="decimal-pad"
            placeholder="₹ paid"
            placeholderTextColor={colors.placeholder}
            style={ui.field}
          />
          <TextInput
            value={references[invoice.id] || ""}
            onChangeText={(value) => setReferences((current) => ({ ...current, [invoice.id]: value }))}
            placeholder="UTR / receipt note (optional)"
            placeholderTextColor={colors.placeholder}
            style={ui.field}
          />
          <Pressable onPress={() => chooseProof(invoice.id)} style={ui.quiet}>
            <Text style={ui.quietText}>
              {picked[invoice.id]?.name || picked[invoice.id] ? "Change screenshot or PDF" : "Attach screenshot or PDF"}
            </Text>
          </Pressable>
          {picked[invoice.id]?.name ? <Text style={ui.meta}>{picked[invoice.id]?.name}</Text> : null}
          <Pressable disabled={savingId === invoice.id} onPress={() => submit(invoice)} style={ui.button}>
            <Text style={ui.buttonText}>{savingId === invoice.id ? "Sending…" : "Submit proof"}</Text>
          </Pressable>
        </View>
      ))}

      {closed.length ? <SectionLabel title="Paid" /> : null}
      {closed.map((invoice) => (
        <View key={invoice.id} style={ui.card}>
          <Text style={ui.label}>Paid · {invoice.period}</Text>
          <Text style={ui.cardTitle}>{invoice.title}</Text>
          <Text style={ui.meta}>{formatRupees(invoice.amountPaise)}</Text>
        </View>
      ))}

      {payments.length ? <SectionLabel title="Office ledger" /> : null}
      {payments.map((payment) => (
        <View key={payment.id} style={ui.card}>
          <Text style={ui.cardTitle}>{formatRupees(payment.amountPaise)}</Text>
          <Text style={ui.meta}>
            {payment.method} · {payment.status}
            {payment.reference ? ` · ${payment.reference}` : ""}
          </Text>
          {proofLinks[payment.id] ? (
            <Pressable onPress={() => Linking.openURL(proofLinks[payment.id])}>
              <Text style={ui.quietText}>Open proof</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </Screen>
  );
}
