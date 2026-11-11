import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { SectionLabel } from "@/components/Blocks";
import { MenuRow, Note, Screen } from "@/components/Screen";
import { loadAccount } from "@/lib/community";
import { loadFeatures, featureOn } from "@/lib/features";
import { type Account } from "@/lib/place";

export default function ServicesScreen() {
  const router = useRouter();
  const [features, setFeatures] = useState<string[] | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [ready, setReady] = useState(false);

  useFocusEffect(useCallback(() => {
    Promise.all([loadFeatures().catch(() => null), loadAccount().catch(() => null)]).then(([enabled, person]) => {
      setFeatures(enabled);
      setAccount(person);
      setReady(true);
    });
  }, []));

  const hasHome = Boolean(account?.flatNumber);
  const notVisitor = account?.role !== "visitor";
  const showCommittee =
    account?.role === "committee" || account?.role === "admin";
  const showHelp = ready && hasHome && notVisitor && featureOn(features, "requests");
  const showBuilding = ready && (featureOn(features, "maintenance") || featureOn(features, "building"));
  const showAmenities = ready && featureOn(features, "amenities");
  const showParking = ready && hasHome && notVisitor && featureOn(features, "parking");
  const showSpaces = showAmenities || showParking;
  const showVisitors = ready && hasHome && notVisitor && featureOn(features, "visitor_passes");
  const showCommitteeDesk = ready && showCommittee && featureOn(features, "committee");

  return (
    <Screen title="Services" showBack={false} busy={!ready}>
      {ready && !features ? <Note text="Could not check which features are open." /> : null}

      {showHelp ? (
        <>
          <SectionLabel title="Help" />
          <MenuRow icon="form" title="Raise a complaint" detail="Water, lift, cleaning, and other issues" onPress={() => router.push("/(resident)/request/new")} />
          <MenuRow icon="mail" title="Complaint history" detail="Status and office replies" onPress={() => router.push("/(resident)/requests")} />
        </>
      ) : null}

      {showBuilding ? (
        <>
          <SectionLabel title="Building" />
          {featureOn(features, "maintenance") ? (
            <MenuRow icon="schedule" title="Maintenance" detail="Official notices. Billing records when the office publishes them." onPress={() => router.push("/(resident)/maintenance")} />
          ) : null}
          {featureOn(features, "building") ? (
            <MenuRow icon="floors" title="Community status" detail="Water, electricity, and lift updates" onPress={() => router.push("/(resident)/status")} />
          ) : null}
        </>
      ) : null}

      {showSpaces ? (
        <>
          <SectionLabel title="Spaces" />
          {showAmenities ? (
            <MenuRow icon="schedule" title="Amenities" detail="Book a shared space" onPress={() => router.push("/(resident)/amenities")} />
          ) : null}
          {showParking ? (
            <MenuRow icon="flat" title="Parking" detail="Vehicles for your home" onPress={() => router.push("/(resident)/parking")} />
          ) : null}
        </>
      ) : null}

      {showVisitors ? (
        <>
          <SectionLabel title="Visitors" />
          <MenuRow icon="people" title="Visitors" detail="Invite, passes, and past visits" onPress={() => router.push("/(resident)/history")} />
        </>
      ) : null}

      {showCommitteeDesk ? (
        <>
          <SectionLabel title="Committee" />
          <MenuRow icon="admin" title="Committee" detail="Open decisions" onPress={() => router.push("/(resident)/committee")} />
        </>
      ) : null}
    </Screen>
  );
}
