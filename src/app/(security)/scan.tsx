import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NavBar, Note, Screen } from "@/components/Screen";
import { colors, ui } from "@/theme";

function codeFromScan(raw: string) {
  const value = raw.trim();
  const fromUrl = value.match(/\/pass\/([A-Z0-9]+)/i);
  if (fromUrl) return fromUrl[1].toUpperCase();
  const token = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return token.length >= 4 ? token.slice(0, 12) : "";
}

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [message, setMessage] = useState("");
  const locked = useRef(false);

  function onScan(payload: { data: string }) {
    if (locked.current) return;
    const code = codeFromScan(payload.data);
    if (!code) {
      setMessage("That code is not a visitor pass.");
      return;
    }
    locked.current = true;
    router.replace(`/(security)/check?code=${encodeURIComponent(code)}`);
  }

  if (!permission) {
    return (
      <Screen title="Scan pass">
        <Text style={ui.body}>Checking camera permission…</Text>
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen title="Scan pass">
        <Text style={ui.body}>Allow the camera so security can read the pass code quickly.</Text>
        <Pressable onPress={() => { requestPermission().catch(() => undefined); }} style={ui.button}>
          <Text style={ui.buttonText}>Allow camera</Text>
        </Pressable>
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      <NavBar title="Scan pass" />
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, gap: 8 }}>
        <Text style={ui.body}>Point at the visitor QR (or the code under it). A missing result is not an entry.</Text>
        {message ? <Note text={message} /> : null}
      </View>
      <CameraView
        style={{ flex: 1, marginHorizontal: 20, marginBottom: Math.max(insets.bottom, 24), borderRadius: 16, overflow: "hidden" }}
        barcodeScannerSettings={{ barcodeTypes: ["qr", "code128", "code39"] }}
        onBarcodeScanned={onScan}
      />
    </View>
  );
}
