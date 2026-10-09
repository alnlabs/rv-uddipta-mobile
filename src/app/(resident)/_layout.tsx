import { Stack } from "expo-router";
import { Workspace } from "@/components/Workspace";
import { colors } from "@/theme";

export default function ResidentLayout() {
  return (
    <Workspace place="home">
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.page } }} />
    </Workspace>
  );
}
