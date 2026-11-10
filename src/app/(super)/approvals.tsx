import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  AdminEmpty,
  AdminIntro,
  AdminRecord,
  AdminScreen,
  AdminSheet,
} from "@/components/AdminUi";
import { Note } from "@/components/Screen";
import { loadApprovals, type ApprovalRequest } from "@/lib/office";

export default function SuperApprovalsScreen() {
  const [waiting, setWaiting] = useState<ApprovalRequest[]>([]);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await loadApprovals();
      setWaiting(data.waiting);
      setMessage("");
    } catch (error) {
      setWaiting([]);
      setMessage(error instanceof Error ? error.message : "Could not load approvals.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <AdminScreen title="Approvals" badge="Overview" onRefresh={load} busy={!ready && !message}>
      <AdminIntro text="Join requests for flats. Approving is handled by society admin." />
      {ready && waiting.length === 0 ? (
        <AdminEmpty title="No one is waiting" detail="Join requests will show here." />
      ) : null}
      {waiting.length ? (
        <AdminSheet>
          {waiting.map((row, index) => (
            <AdminRecord
              key={row.id}
              kicker={`${row.kind} · ${row.home}`}
              title={row.name}
              lines={[row.phone, row.email].filter(Boolean)}
              last={index === waiting.length - 1}
            />
          ))}
        </AdminSheet>
      ) : null}
      {message ? <Note text={message} /> : null}
    </AdminScreen>
  );
}
