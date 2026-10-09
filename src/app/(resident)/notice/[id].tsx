import { useCallback, useState } from "react";
import { Text } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Back, Loading, Note, Screen } from "@/components/Screen";
import { loadNotice, markNoticeRead } from "@/lib/community";
import { ui } from "@/theme";

export default function NoticeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [notice, setNotice] = useState<Awaited<ReturnType<typeof loadNotice>>>(null);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      const notice = await loadNotice(Number(id));
      setNotice(notice);
      if (notice && notice.read !== true) {
        try {
          await markNoticeRead(notice.id);
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "Could not mark that notice as read.");
          return;
        }
      }
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load the notice.");
    } finally {
      setReady(true);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen>
      <Back />
      {!ready ? <Loading /> : null}
      {notice ? (
        <>
          <Text style={ui.label}>{notice.important ? "Important" : notice.label} · {notice.date}</Text>
          <Text style={ui.title}>{notice.title}</Text>
          <Text style={ui.body}>{notice.body || "No further detail."}</Text>
        </>
      ) : null}
      {ready && !notice && !message ? <Text style={ui.body}>This notice is not available.</Text> : null}
      {message ? <Note text={message} /> : null}
    </Screen>
  );
}
