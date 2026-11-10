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
import { loadAccount, switchAccountRole } from "@/lib/community";
import { featureOn, loadFeatures } from "@/lib/features";
import { type Account } from "@/lib/place";
import { loadOfficeDeskSummary, type OfficeDeskSummary } from "@/lib/office";
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

function heldOfficeRole(account: Account) {
  if (account.role === "admin" || account.role === "facility") return account.role;
  return account.roles.find((item) => item.role === "admin")?.role
    || account.roles.find((item) => item.role === "facility")?.role
    || null;
}

/** Society admin / facility — Admin tab opens controls directly. */
export default function OfficeDeskScreen() {
  const router = useRouter();
  const [summary, setSummary] = useState<OfficeDeskSummary | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isFacility, setIsFacility] = useState(false);
  const [features, setFeatures] = useState<string[] | null>(null);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      const [person, enabled] = await Promise.all([
        loadAccount(),
        loadFeatures().catch(() => null),
      ]);
      if (person.superAdmin) {
        router.replace("/(super)");
        return;
      }

      let account = person;
      const officeRole = heldOfficeRole(account);
      if (officeRole && account.role !== "admin" && account.role !== "facility") {
        await switchAccountRole(officeRole);
        account = await loadAccount();
      }

      const admin = account.role === "admin";
      const facility = admin || account.role === "facility";
      setIsAdmin(admin);
      setIsFacility(facility);
      setFeatures(enabled);

      if (!admin && !facility) {
        setSummary(null);
        setMessage("No office role on this account.");
        return;
      }

      const next = await loadOfficeDeskSummary({ admin, facility });
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
      label: "Jobs",
      value: summary ? countLabel(summary.openJobs) : "—",
      href: "/(resident)/jobs",
      show: isFacility && featureOn(features, "maintenance"),
    },
  ].filter((item) => item.show).slice(0, 4);

  // Word actions stay as a list — not the digit grid.
  const actions = [
    {
      title: "Team roles",
      detail: "Facility, security, committee, staff, builder",
      value: "Edit",
      href: "/(resident)/roles",
      show: isAdmin,
    },
    {
      title: "Publish notice",
      detail: "Announcement, maintenance, meeting",
      value: "New",
      href: "/(resident)/publish-notice",
      show: isAdmin && featureOn(features, "announcements"),
    },
    {
      title: "Gate",
      detail: "Visitors and deliveries",
      value: "Open",
      href: "/(security)/gate",
      show: isAdmin,
    },
  ].filter((item) => item.show);

  return (
    <AdminScreen title="Admin" badge="Society office" showBack={false} onRefresh={load} busy={!ready && !message}>
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
