import { useEffect, useRef, type ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";
import * as Linking from "expo-linking";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import { HankenGrotesk_400Regular } from "@expo-google-fonts/hanken-grotesk";
import { Manrope_600SemiBold } from "@expo-google-fonts/manrope";
import { ApartmentBackdrop, Mark } from "@/components/Screen";
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
    openedFor.current = session.user.id;
    loadAccount()
      .then((account) => {
        if (account.needsClaim) router.replace("/(resident)/claim");
        else router.replace(pathForPlace(account.place));
      })
      .catch(() => undefined);
  }, [ready, session, segments, router]);

  useEffect(() => {
    if (!session) return;
    return attachPushRouting((path) => {
      router.push(path as never);
    });
  }, [session, router]);

  if (!ready) {
    return (
      <ApartmentBackdrop>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }}>
          <Mark size={84} />
          <ActivityIndicator color="#f8fafc" />
        </View>
      </ApartmentBackdrop>
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
      <ApartmentBackdrop>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }}>
          <Mark size={84} />
          <ActivityIndicator color="#f8fafc" />
        </View>
      </ApartmentBackdrop>
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
