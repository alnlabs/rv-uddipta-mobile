import { useEffect, useState } from "react";
import { Pressable, Text } from "react-native";
import { useURL } from "expo-linking";
import { BrandScreen } from "@/components/Screen";
import { finishAuthRedirect } from "@/lib/finishAuth";

export default function AuthReturn() {
  const url = useURL();
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!url) return;
    finishAuthRedirect(url).catch((error) => {
      setMessage(error instanceof Error ? error.message : "Could not sign in.");
    });
  }, [url]);

  if (message) {
    return (
      <BrandScreen>
        <Text style={{ color: "#f8fafc", textAlign: "center", paddingHorizontal: 24 }}>{message}</Text>
        <Pressable onPress={() => setMessage("")} style={{ marginTop: 16 }}>
          <Text style={{ color: "#f8fafc", fontWeight: "600" }}>Try again</Text>
        </Pressable>
      </BrandScreen>
    );
  }

  return <BrandScreen busy status="Finishing sign-in…" />;
}
