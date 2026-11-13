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
import { planDayLabel } from "@/lib/day";
import { loadAmenities, type AmenityBooking } from "@/lib/office";

export default function SuperBookingsScreen() {
  const [pending, setPending] = useState<AmenityBooking[]>([]);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await loadAmenities();
      setPending(data.pending ?? []);
      setMessage("");
    } catch (error) {
      setPending([]);
      setMessage(error instanceof Error ? error.message : "Could not load bookings.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <AdminScreen title="Amenity bookings" badge="Overview" onRefresh={load} busy={!ready && !message}>
      <AdminIntro text="Pending amenity bookings. Confirmations are handled by facility." />
      {ready && pending.length === 0 ? (
        <AdminEmpty title="No pending bookings" detail="New amenity requests will show here." />
      ) : null}
      {pending.length ? (
        <AdminSheet>
          {pending.map((row, index) => (
            <AdminRecord
              key={row.id}
              kicker={`${row.status} · ${row.home}`}
              title={row.space}
              lines={[
                `${planDayLabel(row.when) || row.when} · ${row.slot}`,
                row.who || "",
              ].filter(Boolean)}
              last={index === pending.length - 1}
            />
          ))}
        </AdminSheet>
      ) : null}
      {message ? <Note text={message} /> : null}
    </AdminScreen>
  );
}
