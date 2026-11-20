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
import { loadAccount } from "@/lib/community";
import { featureOn, loadFeatures } from "@/lib/features";
import { canManageArea, loadOfficeDeskSummary, type OfficeDeskSummary } from "@/lib/office";
import { fonts } from "@/theme";

function countLabel(count: number) {
  if (count <= 0) return "0";
  return String(count);
}

function StatTile({
  label,
  value,
  onPress,
}: {
  label: string
  value: string | number
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
        paddingVertical: 14,
        gap: 6,
      }}
    >
      <Text style={{ color: "#64748b", fontFamily: fonts.display, fontSize: 11, fontWeight: "600", letterSpacing: 0.8, textTransform: "uppercase" }}>
        {label}
      </Text>
      <Text style={{ color: ops.ink, fontFamily: fonts.display, fontSize: 26, fontWeight: "600" }}>
        {value}
      </Text>
    </Pressable>
  );
}

/** Society admin / facility / repairs area owner — Admin tab opens controls. */
export default function OfficeDeskScreen() {
  const router = useRouter();
  const [summary, setSummary] = useState<OfficeDeskSummary | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isFacility, setIsFacility] = useState(false);
  const [canJobs, setCanJobs] = useState(false);
  const [features, setFeatures] = useState<string[] | null>(null);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      const [person, enabled, repairsDesk] = await Promise.all([
        loadAccount(),
        loadFeatures().catch(() => null),
        canManageArea("repairs").catch(() => false),
      ]);
      if (person.superAdmin) {
        router.replace("/(super)");
        return;
      }

      const account = person;
      const holdsAdmin = account.role === "admin"
        || account.roles.some((item) => item.role === "admin");
      const holdsFacility = account.role === "facility"
        || account.roles.some((item) => item.role === "facility")
        || holdsAdmin;
      setIsAdmin(holdsAdmin);
      setIsFacility(holdsFacility);
      setCanJobs(holdsAdmin || holdsFacility || repairsDesk);
      setFeatures(enabled);

      if (!holdsAdmin && !holdsFacility && !repairsDesk) {
        setSummary(null);
        setMessage("No society admin, facility, or repairs desk role on this account. Ask a super admin to assign it under Roles.");
        return;
      }

      // Do not auto-switch active role — Admin is a desk, not a forced persona change.
      const next = await loadOfficeDeskSummary({
        admin: holdsAdmin,
        facility: holdsFacility || repairsDesk,
      });
      setSummary(next);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load Admin.");
    } finally {
      setReady(true);
    }
  }, [router]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Counts only — short digit tiles in a grid (up to 4).
  const stats = [
    {
      label: "Approvals",
      value: summary ? countLabel(summary.approvals) : "—",
      href: "/(resident)/approvals",
      show: isAdmin,
    },
    {
      label: "Requests",
      value: summary ? countLabel(summary.requests) : "—",
      href: "/(resident)/office-requests",
      show: isAdmin && featureOn(features, "requests"),
    },
    {
      label: "Bookings",
      value: summary ? countLabel(summary.bookings) : "—",
      href: "/(resident)/bookings",
      show: isFacility && featureOn(features, "amenities"),
    },
    {
      label: "Tasks",
      value: summary ? countLabel(summary.openJobs) : "—",
      href: "/(resident)/jobs",
      show: canJobs && featureOn(features, "maintenance"),
    },
  ].filter((item) => item.show).slice(0, 4);

  // Word actions stay as a list — not the digit grid.
  const actions = [
    {
      title: "People",
      detail: "Who holds Security, Staff, Facility, and other society roles",
      value: "Edit",
      href: "/(resident)/roles",
      show: isAdmin,
    },
    {
      title: "Attendance",
      detail: "Staff & facility for today (Security marks; not listed)",
      value: "View",
      href: "/(resident)/attendance",
      show: isAdmin || isFacility,
    },
    {
      title: "Publish notice",
      detail: "Announcement, maintenance, meeting",
      value: "New",
      href: "/(resident)/publish-notice",
      show: isAdmin && featureOn(features, "announcements"),
    },
  ].filter((item) => item.show);

  return (
    <AdminScreen title="Admin" badge="Society" showBack={false} onRefresh={load} busy={!ready && !message}>
      {message ? <AdminBanner text={message} /> : null}

      {stats.length ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {stats.map((tile) => (
            <StatTile
              key={tile.href}
              label={tile.label}
              value={tile.value}
              onPress={() => router.push(tile.href as never)}
            />
          ))}
        </View>
      ) : null}

      {actions.length ? (
        <AdminSheet>
          {actions.map((row, index) => (
            <AdminRow
              key={row.href}
              title={row.title}
              detail={row.detail}
              value={row.value}
              last={index === actions.length - 1}
              onPress={() => router.push(row.href as never)}
            />
          ))}
        </AdminSheet>
      ) : null}
    </AdminScreen>
  );
}
