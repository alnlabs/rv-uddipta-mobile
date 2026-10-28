import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useURL } from "expo-linking";
import { finishAuthRedirect } from "@/lib/finishAuth";
import { colors, ui } from "@/theme";

export default function AuthReturn() {
  const url = useURL();
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!url) return;
    finishAuthRedirect(url).catch((error) => {
      setMessage(error instanceof Error ? error.message : "Could not sign in.");
    });
  }, [url]);

  return (
    <View style={[ui.page, { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }]}>
      {message ? <Text style={ui.error}>{message}</Text> : <ActivityIndicator color={colors.ink} />}
      <Text style={ui.body}>{message ? "Sign-in stopped." : "Returning to RV Uddiipta"}</Text>
    </View>
  );
}
