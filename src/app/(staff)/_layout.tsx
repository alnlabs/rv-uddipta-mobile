import { Stack } from "expo-router";
import { Workspace } from "@/components/Workspace";
import { colors } from "@/theme";

export default function StaffLayout() {
  return (
    <Workspace place="work">
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.page } }} />
    </Workspace>
  );
}
