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
import { loadNeighbours, type NeighbourHome } from "@/lib/office";

export default function SuperHomesScreen() {
  const [homes, setHomes] = useState<NeighbourHome[]>([]);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async (q: string) => {
    try {
      const data = await loadNeighbours(q);
      setHomes(data.homes);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load homes.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(""); }, [load]));

  function closeSearch() {
    setSearching(false);
    setQuery("");
    load("").catch(() => undefined);
  }

  return (
    <AdminScreen
      title="Homes"
      badge="Overview"
      busy={!ready && !message}
      onRefresh={() => load(query)}
      search={{
        open: searching,
        value: query,
        placeholder: "Flat or name",
        onOpen: () => setSearching(true),
        onClose: closeSearch,
        onChange: setQuery,
        onSubmit: () => { load(query).catch(() => undefined); },
      }}
    >
      <AdminIntro text="Flats and residents across the society." />
      {ready && homes.length === 0 ? (
        <AdminEmpty title="No matching homes" />
      ) : null}
      {homes.length ? (
        <AdminSheet>
          {homes.map((home, index) => (
            <AdminRecord
              key={home.home}
              kicker={`${home.home} · Floor ${home.floor} · ${home.type} · ${home.registered ? "Verified" : "Not verified"}`}
              title={home.owner}
              lines={[home.tenant ? `Tenant · ${home.tenant}` : ""].filter(Boolean)}
              last={index === homes.length - 1}
            />
          ))}
        </AdminSheet>
      ) : null}
      {message ? <Note text={message} /> : null}
    </AdminScreen>
  );
}
