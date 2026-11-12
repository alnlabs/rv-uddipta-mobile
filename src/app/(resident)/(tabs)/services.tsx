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

  const hasHome = Boolean(account?.hasFlat || account?.flatNumber);
  const notVisitor = account?.role !== "visitor";
  const canInvite = hasHome && notVisitor;
  const showCommittee =
    account?.role === "committee" || account?.role === "admin";
  const showHelp = ready && hasHome && notVisitor && featureOn(features, "requests");
  const showBuilding = ready && (
    featureOn(features, "maintenance")
    || featureOn(features, "building")
    || featureOn(features, "billing")
    || featureOn(features, "ops")
  );
  const showAmenities = ready && featureOn(features, "amenities");
  const showParking = ready && hasHome && notVisitor && featureOn(features, "parking");
  const showSpaces = showAmenities || showParking;
  // Flat members create passes (RPC enforces access). Do not hide behind list_my_features.
  const showVisitors = ready && canInvite;
  const showWorkforce = ready && hasHome && notVisitor && featureOn(features, "workforce");
  const showPapers = ready && hasHome && notVisitor && featureOn(features, "documents");
  const showCirculars = ready && featureOn(features, "circulars");
  const showCommitteeDesk = ready && showCommittee && featureOn(features, "committee");
  const nothingYet = ready && !showHelp && !showBuilding && !showSpaces && !showVisitors && !showWorkforce && !showPapers && !showCirculars && !showCommitteeDesk;

  return (
    <Screen title="Services" showBack={false} busy={!ready}>
      {ready && features === null ? <Note text="Could not check which features are open." /> : null}
      {nothingYet ? (
        <Note text={hasHome
          ? "No services are open for this home yet."
          : "Link a flat to use complaints, parking, and gate passes."}
        />
      ) : null}

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
            <MenuRow icon="schedule" title="Maintenance" detail="Official notices and links to dues" onPress={() => router.push("/(resident)/maintenance")} />
          ) : null}
          {featureOn(features, "billing") ? (
            <MenuRow icon="form" title="Dues" detail="Invoices and office ledger for your home" onPress={() => router.push("/(resident)/dues")} />
          ) : null}
          {featureOn(features, "building") ? (
            <MenuRow icon="floors" title="Community status" detail="Water, electricity, and lift updates" onPress={() => router.push("/(resident)/status")} />
          ) : null}
          {featureOn(features, "ops") ? (
            <MenuRow icon="floors" title="Building ops" detail="Open outages and tanker notes" onPress={() => router.push("/(resident)/ops")} />
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

      {showVisitors || showWorkforce ? (
        <>
          <SectionLabel title="Visitors" />
          {showVisitors ? (
            <>
              <MenuRow icon="people" title="Create gate pass" detail="Invite a guest with a QR for the gate" onPress={() => router.push("/(resident)/invite")} />
              <MenuRow icon="schedule" title="Visitor passes" detail="Open and past visits" onPress={() => router.push("/(resident)/history")} />
            </>
          ) : null}
          {showWorkforce ? (
            <MenuRow icon="people" title="Helpers and vendors" detail="Domestic help, vendors, and cab passes" onPress={() => router.push("/(resident)/workforce")} />
          ) : null}
        </>
      ) : null}

      {showPapers ? (
        <>
          <SectionLabel title="Papers" />
          <MenuRow icon="form" title="NOC and papers" detail="Move-in, move-out, sale, and renovation requests" onPress={() => router.push("/(resident)/nocs")} />
        </>
      ) : null}

      {showCirculars ? (
        <>
          <SectionLabel title="Official" />
          <MenuRow icon="bell" title="Circulars" detail="Acknowledge official circulars" onPress={() => router.push("/(resident)/circulars")} />
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
