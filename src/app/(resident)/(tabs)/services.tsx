import { useCallback, useState } from "react";
import { Text } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { MenuRow, Screen } from "@/components/Screen";
import { loadAccount } from "@/lib/community";
import { loadFeatures, featureOn } from "@/lib/features";
import { ui } from "@/theme";

export default function ServicesScreen() {
  const router = useRouter();
  const [features, setFeatures] = useState<string[] | null>(null);
  const [showCommittee, setShowCommittee] = useState(false);

  useFocusEffect(useCallback(() => {
    Promise.all([loadFeatures().catch(() => null), loadAccount().catch(() => null)]).then(([enabled, account]) => {
      setFeatures(enabled);
      setShowCommittee(
        account?.role === "committee"
          || account?.role === "admin"
          || Boolean(account?.roles.some((item) => item.role === "committee" || item.role === "admin")),
      );
    });
  }, []));

  return (
    <Screen underHeader>
      <Text style={ui.heading}>Services</Text>
      {featureOn(features, "requests") ? (
        <>
          <MenuRow icon="form" title="Raise a complaint" detail="Water, lift, cleaning, and other issues" onPress={() => router.push("/(resident)/request/new")} />
          <MenuRow icon="mail" title="Complaint history" detail="Status and office replies" onPress={() => router.push("/(resident)/requests")} />
        </>
      ) : null}
      <MenuRow icon="schedule" title="Maintenance" detail="Official notices. Billing records when the office publishes them." onPress={() => router.push("/(resident)/maintenance")} />
      <MenuRow icon="floors" title="Community status" detail="Water, electricity, and lift updates" onPress={() => router.push("/(resident)/status")} />
      {featureOn(features, "amenities") ? (
        <MenuRow icon="schedule" title="Amenities" detail="Book a shared space" onPress={() => router.push("/(resident)/amenities")} />
      ) : null}
      {featureOn(features, "parking") ? (
        <MenuRow icon="flat" title="Parking" detail="Vehicles for your home" onPress={() => router.push("/(resident)/parking")} />
      ) : null}
      {showCommittee && featureOn(features, "committee") ? (
        <MenuRow icon="admin" title="Committee" detail="Open decisions" onPress={() => router.push("/(resident)/committee")} />
      ) : null}
      {featureOn(features, "visitor_passes") ? (
        <>
          <Text style={ui.label}>Visitors</Text>
          <MenuRow icon="people" title="Invite a visitor" detail="Pre-register someone for the gate" onPress={() => router.push("/(resident)/invite")} />
          <MenuRow icon="gate" title="Visitor history" detail="Passes, approvals, and past visits" onPress={() => router.push("/(resident)/history")} />
        </>
      ) : null}
    </Screen>
  );
}
