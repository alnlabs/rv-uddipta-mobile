import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import {
  AdminBanner,
  AdminRow,
  AdminScreen,
  AdminSheet,
  ops,
} from "@/components/AdminUi";
import { SignOut } from "@/components/Screen";
import { loadAccount } from "@/lib/community";
import { featureOn, loadFeatures } from "@/lib/features";
import { loadOfficeDeskSummary, type OfficeDeskSummary } from "@/lib/office";
import { fonts } from "@/theme";

function countLabel(count: number) {
  if (count <= 0) return "0";
  return String(count);
}

function OverviewTile({
  title,
  value,
  onPress,
}: {
  title: string
  value: string
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: "47%",
        backgroundColor: ops.sheet,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: ops.line,
        paddingHorizontal: 14,
        paddingVertical: 16,
        gap: 6,
      }}
    >
      <Text style={{ color: "#64748b", fontFamily: fonts.display, fontSize: 11, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase" }}>
        {title}
      </Text>
      <Text style={{ color: ops.ink, fontFamily: fonts.display, fontSize: 26, fontWeight: "600" }}>
        {value}
      </Text>
    </Pressable>
  );
}

export default function SuperAdminHome() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [summary, setSummary] = useState<OfficeDeskSummary | null>(null);
  const [features, setFeatures] = useState<string[] | null>(null);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const [account, enabled] = await Promise.all([
        loadAccount(),
        loadFeatures().catch(() => null),
      ]);
      setName(account.name);
      setFeatures(enabled);
      const next = await loadOfficeDeskSummary({ admin: true, facility: true });
      setSummary(next);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load.");
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const overview = [
    {
      title: "Approvals",
      value: summary ? countLabel(summary.approvals) : "—",
      href: "/(super)/approvals",
      show: true,
    },
    {
      title: "Requests",
      value: summary ? countLabel(summary.requests) : "—",
      href: "/(super)/requests",
      show: featureOn(features, "requests"),
    },
    {
      title: "Bookings",
      value: summary ? countLabel(summary.bookings) : "—",
      href: "/(super)/bookings",
      show: featureOn(features, "amenities"),
    },
    {
      title: "Jobs",
      value: summary ? countLabel(summary.openJobs) : "—",
      href: "/(super)/jobs",
      show: featureOn(features, "maintenance"),
    },
  ].filter((item) => item.show);

  const more = [
    {
      title: "Homes",
      detail: "Flats and residents",
      href: "/(super)/homes",
      show: featureOn(features, "neighbours"),
    },
    {
      title: "Committee",
      detail: "Policies, budgets, and votes",
      href: "/(super)/committee",
      show: featureOn(features, "committee"),
    },
  ].filter((item) => item.show);

  return (
    <AdminScreen title="Super admin" badge="Platform" showBack={false} onRefresh={load} busy={!ready && !message}>
      {message ? <AdminBanner text={message} /> : null}

      <View style={{ marginHorizontal: 16, marginBottom: 14, backgroundColor: ops.header, borderRadius: 14, padding: 16, gap: 14 }}>
        {name ? (
          <Text style={{ color: ops.headerText, fontFamily: fonts.display, fontSize: 22, fontWeight: "600" }}>
            {name}
          </Text>
        ) : null}
        <Pressable
          onPress={() => router.push("/(super)/roles")}
          style={{
            minHeight: 48,
            borderRadius: 10,
            backgroundColor: ops.headerText,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 16,
          }}
        >
          <Text style={{ color: ops.header, fontFamily: fonts.display, fontSize: 15, fontWeight: "600" }}>
            Office roles
          </Text>
        </Pressable>
      </View>

      {overview.length ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {overview.map((item) => (
            <OverviewTile
              key={item.href}
              title={item.title}
              value={item.value}
              onPress={() => router.push(item.href as never)}
            />
          ))}
        </View>
      ) : null}

      {more.length ? (
        <AdminSheet>
          {more.map((row, index) => (
            <AdminRow
              key={row.href}
              title={row.title}
              detail={row.detail}
              value="View"
              last={index === more.length - 1}
              onPress={() => router.push(row.href as never)}
            />
          ))}
        </AdminSheet>
      ) : null}

      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <SignOut />
      </View>
    </AdminScreen>
  );
}
