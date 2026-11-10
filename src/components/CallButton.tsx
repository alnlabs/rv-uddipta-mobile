import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { placeCall } from "@/lib/call";
import { colors, ui } from "@/theme";

export function CallButton({
  home,
  which = "owner",
  label,
  showNumber,
  masked,
  compact = false,
}: Readonly<{
  home: string
  which?: "owner" | "tenant"
  label?: string
  showNumber?: boolean
  masked?: string | null
  compact?: boolean
}>) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const title = label || (which === "tenant" ? "Call tenant" : "Call");

  async function onPress() {
    if (busy || !home.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await placeCall(home, which);
      if (result.showNumber && result.display) {
        setMessage("");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start that call.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: 6 }}>
      {showNumber && masked ? <Text style={ui.meta}>{masked}</Text> : null}
      <Pressable
        disabled={busy}
        onPress={onPress}
        style={
          compact
            ? [ui.quiet, { alignSelf: "flex-start", paddingVertical: 6, paddingHorizontal: 10 }]
            : ui.button
        }
      >
        <Text style={compact ? ui.quietText : ui.buttonText}>
          {busy ? "Calling…" : title}
        </Text>
      </Pressable>
      {message ? <Text style={[ui.meta, { color: colors.danger }]}>{message}</Text> : null}
    </View>
  );
}
