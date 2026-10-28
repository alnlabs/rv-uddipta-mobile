import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { Back, Note, Screen } from "@/components/Screen";
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
      <Screen>
        <Back />
        <Text style={ui.title}>Scan pass</Text>
        <Text style={ui.body}>Checking camera permission…</Text>
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen>
        <Back />
        <Text style={ui.eyebrow}>Gate</Text>
        <Text style={ui.title}>Scan pass</Text>
        <Text style={ui.body}>Allow the camera so security can read the pass code quickly.</Text>
        <Pressable onPress={() => { requestPermission().catch(() => undefined); }} style={ui.button}>
          <Text style={ui.buttonText}>Allow camera</Text>
        </Pressable>
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      <Screen>
        <Back />
        <Text style={ui.eyebrow}>Gate</Text>
        <Text style={ui.title}>Scan pass</Text>
        <Text style={ui.body}>Point at the QR or the pass code. A missing result is not an entry.</Text>
      </Screen>
      <CameraView
        style={{ flex: 1, margin: 20, borderRadius: 16, overflow: "hidden", minHeight: 320 }}
        barcodeScannerSettings={{ barcodeTypes: ["qr", "code128", "code39"] }}
        onBarcodeScanned={onScan}
      />
      {message ? (
        <View style={{ paddingHorizontal: 20, paddingBottom: 28 }}>
          <Note text={message} />
        </View>
      ) : null}
    </View>
  );
}
