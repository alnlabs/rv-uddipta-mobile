import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useURL } from "expo-linking";
import { ApartmentBackdrop } from "@/components/Screen";
import { finishAuthRedirect } from "@/lib/finishAuth";
import { ui } from "@/theme";

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
    <ApartmentBackdrop>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 }}>
        {message ? <Text style={ui.error}>{message}</Text> : <ActivityIndicator color="#f8fafc" />}
        <Text style={[ui.body, { color: "#f8fafc", textAlign: "center" }]}>
          {message ? "Sign-in stopped." : "Returning to RV Uddiipta"}
        </Text>
      </View>
    </ApartmentBackdrop>
  );
}
