import { useCallback, useState } from "react";
import { View } from "react-native";
import { useFocusEffect } from "expo-router";
import {
  AdminEmpty,
  AdminIntro,
  AdminRecord,
  AdminScreen,
  AdminSheet,
} from "@/components/AdminUi";
import { Chips } from "@/components/Blocks";
import { Note } from "@/components/Screen";
import { loadOfficeRequests, type OfficeRequest } from "@/lib/office";

export default function SuperRequestsScreen() {
  const [kind, setKind] = useState<"request" | "feedback">("request");
  const [rows, setRows] = useState<OfficeRequest[]>([]);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await loadOfficeRequests(kind);
      setRows(data.requests);
      setMessage("");
    } catch (error) {
      setRows([]);
      setMessage(error instanceof Error ? error.message : "Could not load requests.");
    } finally {
      setReady(true);
    }
  }, [kind]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <AdminScreen title="Office requests" badge="Overview" onRefresh={load} busy={!ready && !message}>
      <AdminIntro text="Complaints and feedback from homes. Replies are handled by society admin." />
      <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
        <Chips
          options={[
            { value: "request", label: "Requests" },
            { value: "feedback", label: "Feedback" },
          ]}
          value={kind}
          onChange={(value) => setKind(value as "request" | "feedback")}
        />
      </View>
      {ready && rows.length === 0 ? (
        <AdminEmpty title="Nothing here" detail="Resident requests will show here." />
      ) : null}
      {rows.length ? (
        <AdminSheet>
          {rows.map((row, index) => (
            <AdminRecord
              key={row.id}
              kicker={`${row.statusLabel || row.status} · ${row.home || "No home"}`}
              title={row.who || "Resident"}
              lines={[
                row.body,
                row.assigneeName ? `Assigned · ${row.assigneeName}` : "",
                row.date || "",
              ].filter(Boolean)}
              last={index === rows.length - 1}
            />
          ))}
        </AdminSheet>
      ) : null}
      {message ? <Note text={message} /> : null}
    </AdminScreen>
  );
}
