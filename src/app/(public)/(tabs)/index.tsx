import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Note, Screen } from "@/components/Screen";
import { loadBrochureProject } from "@/lib/brochure";
import { loadAccount } from "@/lib/community";
import { joinKindLabel } from "@/lib/join";
import { pathForAccount, type Account } from "@/lib/place";
import { colors, ui } from "@/theme";

export default function PublicHomeScreen() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [project, setProject] = useState<Awaited<ReturnType<typeof loadBrochureProject>> | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const [nextAccount, nextProject] = await Promise.all([loadAccount(), loadBrochureProject()]);
      if (!nextAccount.needsJoin && !nextAccount.joinPending && !nextAccount.joinBrowse) {
        router.replace(pathForAccount(nextAccount));
        return;
      }
      if (nextAccount.needsJoin) {
        router.replace("/(public)/join");
        return;
      }
      setAccount(nextAccount);
      setProject(nextProject);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load the project.");
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen title={project?.name || "RV Uddiipta"} showBack={false} onRefresh={load} busy={!project && !message}>
      {account?.joinPending ? (
        <Note
          text={
            account.joinRequest?.flatNumber
              ? `Waiting for approval on ${account.joinRequest.flatNumber} (${joinKindLabel(account.joinRequest.kind)}).`
              : `Waiting for approval as ${joinKindLabel(account.joinRequest?.kind)}.`
          }
        />
      ) : null}
      {account?.joinBrowse ? (
        <Note text="You are browsing public pages. Request access when you are ready." tone="ok" />
      ) : null}

      {project ? (
        <View style={ui.card}>
          <Text style={ui.heading}>{project.tagline}</Text>
          <Text style={[ui.body, { marginTop: 8 }]}>
            {project.developer}. {project.location}.
          </Text>
          <Text style={ui.body}>{project.address}</Text>
          <Text style={[ui.body, { marginTop: 8 }]}>RERA {project.rera}</Text>
          <View style={{ flexDirection: "row", gap: 16, marginTop: 16 }}>
            <View>
              <Text style={ui.label}>Homes</Text>
              <Text style={ui.heading}>{project.units}</Text>
            </View>
            <View>
              <Text style={ui.label}>Acres</Text>
              <Text style={ui.heading}>{project.acres}</Text>
            </View>
            <View>
              <Text style={ui.label}>Floors</Text>
              <Text style={ui.heading}>{project.floors}</Text>
            </View>
          </View>
        </View>
      ) : null}

      {project?.nearby?.length ? (
        <View style={ui.card}>
          <Text style={ui.label}>Nearby</Text>
          {project.nearby.map((place) => (
            <Text key={place.label} style={ui.body}>
              {place.label} · {place.distance}
            </Text>
          ))}
        </View>
      ) : null}

      <Pressable
        onPress={() => router.push("/(public)/join")}
        style={[ui.button, { backgroundColor: colors.button }]}
      >
        <Text style={ui.buttonText}>
          {account?.joinPending ? "View request" : "Request access"}
        </Text>
      </Pressable>

      {message ? <Note text={message} /> : null}
    </Screen>
  );
}
