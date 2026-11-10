import { View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { passShareUrl } from "@/lib/site";
import { colors } from "@/theme";

export function PassQr({ code, size = 200 }: Readonly<{ code: string; size?: number }>) {
  const value = passShareUrl(code);
  return (
    <View
      style={{
        alignSelf: "center",
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 14,
      }}
    >
      <QRCode
        value={value}
        size={size}
        color={colors.ink}
        backgroundColor={colors.white}
      />
    </View>
  );
}
