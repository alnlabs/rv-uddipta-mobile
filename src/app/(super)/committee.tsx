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
import { loadCommittee } from "@/lib/office";

export default function SuperCommitteeScreen() {
  const [items, setItems] = useState<Awaited<ReturnType<typeof loadCommittee>>["items"]>([]);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await loadCommittee();
      setItems(data.items);
      setMessage("");
    } catch (error) {
      setItems([]);
      setMessage(error instanceof Error ? error.message : "Could not load committee.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <AdminScreen title="Committee" badge="Overview" onRefresh={load} busy={!ready && !message}>
      <AdminIntro text="Committee items and decisions. Voting stays with committee and society admin." />
      {ready && items.length === 0 ? (
        <AdminEmpty title="No items" detail="Committee items will show here." />
      ) : null}
      {items.length ? (
        <AdminSheet>
          {items.map((item, index) => (
            <AdminRecord
              key={item.id}
              kicker={`${item.kind} · ${item.status}`}
              title={item.title}
              lines={[
                item.body?.replace(/<[^>]+>/g, " ").trim() || "",
                item.decision ? `Decision · ${item.decision}` : "",
              ].filter(Boolean)}
              last={index === items.length - 1}
            />
          ))}
        </AdminSheet>
      ) : null}
      {message ? <Note text={message} /> : null}
    </AdminScreen>
  );
}
