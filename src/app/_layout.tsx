import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, Text } from "react-native";
import * as Linking from "expo-linking";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import { HankenGrotesk_400Regular } from "@expo-google-fonts/hanken-grotesk";
import { Manrope_600SemiBold } from "@expo-google-fonts/manrope";
import { BrandScreen } from "@/components/Screen";
import { loadAccount } from "@/lib/community";
import { finishAuthRedirect, isAuthReturn } from "@/lib/finishAuth";
import { attachPushRouting, registerPush } from "@/lib/notify";
import { pathForAccount, publicMayVisit, superMayVisit } from "@/lib/place";
import { SessionProvider, useSession } from "@/lib/session";
import { colors } from "@/theme";

function Gate({ children }: { children: ReactNode }) {
  const { ready, session } = useSession();
  const segments = useSegments();
  const router = useRouter();
  const openedFor = useRef<string | null>(null);
  const [startError, setStartError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    function accept(url: string | null) {
      if (!url || !isAuthReturn(url)) return;
      finishAuthRedirect(url).catch(() => undefined);
    }
    Linking.getInitialURL().then(accept);
    const sub = Linking.addEventListener("url", ({ url }) => accept(url));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const onSignIn = segments[0] === "sign-in" || segments[0] === "auth";
    if (!session && !onSignIn) router.replace("/sign-in");
    if (!session) {
      openedFor.current = null;
      setBooting(false);
      return;
    }
    registerPush(session.access_token).catch(() => undefined);
    if (openedFor.current === session.user.id) {
      loadAccount()
        .then((account) => {
          if (account.superAdmin && !superMayVisit(segments as string[])) {
            router.replace("/(super)");
            return;
          }
          const publicOnly = Boolean(account.needsJoin || account.joinPending || account.joinBrowse);
          const onPublic = segments[0] === "(public)";
          if (publicOnly && !publicMayVisit(segments as string[])) {
            router.replace(pathForAccount(account));
            return;
          }
          if (!publicOnly && onPublic) {
            router.replace(pathForAccount(account));
          }
        })
        .catch(() => undefined);
      setBooting(false);
      return;
    }
    setBooting(true);
    loadAccount()
      .then((account) => {
        openedFor.current = session.user.id;
        setStartError("");
        router.replace(pathForAccount(account));
      })
      .catch((error: unknown) => {
        openedFor.current = null;
        setStartError(error instanceof Error ? error.message : "Could not open your account.");
      })
      .finally(() => {
        setBooting(false);
      });
  }, [ready, session, segments, router, attempt]);

  useEffect(() => {
    if (!session) return;
    return attachPushRouting((path) => {
      router.push(path as never);
    });
  }, [session, router]);

  if (startError) {
    return (
      <BrandScreen>
        <Text style={{ color: "#f8fafc", textAlign: "center", paddingHorizontal: 24 }}>{startError}</Text>
        <Pressable
          onPress={() => {
            setStartError("");
            setBooting(true);
            setAttempt((value) => value + 1);
          }}
          style={{ marginTop: 16 }}
        >
          <Text style={{ color: "#f8fafc", fontWeight: "600" }}>Try again</Text>
        </Pressable>
      </BrandScreen>
    );
  }

  // Launch brand screen until session + first route are ready (no skeleton).
  if (!ready || booting) {
    return (
      <BrandScreen
        busy
        status={!ready ? "Checking your sign-in…" : "Opening your account…"}
      />
    );
  }

  return children;
}

export default function RootLayout() {
  const [fontsReady, fontError] = useFonts({
    Manrope_600SemiBold,
    HankenGrotesk_400Regular,
  });

  if (!fontsReady && !fontError) return <BrandScreen busy status="Starting…" />;

  return (
    <SessionProvider>
      <Gate>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.page } }}>
          <Stack.Screen name="(public)" />
          <Stack.Screen name="(super)" />
          <Stack.Screen name="(resident)" />
          <Stack.Screen name="(security)" />
          <Stack.Screen name="(staff)" />
          <Stack.Screen name="sign-in" />
        </Stack>
      </Gate>
    </SessionProvider>
  );
}
