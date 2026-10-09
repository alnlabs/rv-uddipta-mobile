import { Stack } from "expo-router";
import { Workspace } from "@/components/Workspace";
import { colors } from "@/theme";

export default function SecurityLayout() {
  return (
    <Workspace place="gate">
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.page } }} />
    </Workspace>
  );
}
