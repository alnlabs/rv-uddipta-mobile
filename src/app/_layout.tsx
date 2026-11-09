import { useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";
import * as Linking from "expo-linking";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import { HankenGrotesk_400Regular } from "@expo-google-fonts/hanken-grotesk";
import { Manrope_600SemiBold } from "@expo-google-fonts/manrope";
import { BrandScreen } from "@/components/Screen";
import { loadAccount } from "@/lib/community";
import { finishAuthRedirect, isAuthReturn } from "@/lib/finishAuth";
import { attachPushRouting, registerPush } from "@/lib/notify";
import { pathForPlace } from "@/lib/place";
import { SessionProvider, useSession } from "@/lib/session";
import { colors } from "@/theme";

function Gate({ children }: { children: ReactNode }) {
  const { ready, session } = useSession();
  const segments = useSegments();
  const router = useRouter();
  const openedFor = useRef<string | null>(null);
  const [startError, setStartError] = useState("");
  const [attempt, setAttempt] = useState(0);

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
      return;
    }
    registerPush(session.access_token).catch(() => undefined);
    if (openedFor.current === session.user.id) return;
    loadAccount()
      .then((account) => {
        openedFor.current = session.user.id;
        setStartError("");
        if (account.needsClaim) router.replace("/(resident)/claim");
        else router.replace(pathForPlace(account.place));
      })
      .catch((error: unknown) => {
        openedFor.current = null;
        setStartError(error instanceof Error ? error.message : "Could not open your account.");
      });
  }, [ready, session, segments, router, attempt]);

  useEffect(() => {
    if (!session) return;
    return attachPushRouting((path) => {
      router.push(path as never);
    });
  }, [session, router]);

  if (!ready || startError) {
    return (
      <BrandScreen>
        {startError ? (
          <>
            <Text style={{ color: "#f8fafc", textAlign: "center", paddingHorizontal: 24 }}>{startError}</Text>
            <Pressable onPress={() => { setStartError(""); setAttempt((value) => value + 1); }} style={{ marginTop: 16 }}>
              <Text style={{ color: "#f8fafc", fontWeight: "600" }}>Try again</Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator color="#f8fafc" />
        )}
      </BrandScreen>
    );
  }

  return children;
}

export default function RootLayout() {
  const [fontsReady, fontError] = useFonts({
    Manrope_600SemiBold,
    HankenGrotesk_400Regular,
  });

  if (!fontsReady && !fontError) {
    return (
      <BrandScreen>
        <ActivityIndicator color="#f8fafc" />
      </BrandScreen>
    );
  }

  return (
    <SessionProvider>
      <Gate>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.page } }}>
          <Stack.Screen name="(resident)" />
          <Stack.Screen name="(security)" />
          <Stack.Screen name="(staff)" />
          <Stack.Screen name="sign-in" />
        </Stack>
      </Gate>
    </SessionProvider>
  );
}
