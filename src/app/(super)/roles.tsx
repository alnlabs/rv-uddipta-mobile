import { OfficeRolesSetup } from "@/components/OfficeRolesSetup";
import { RolesAssign } from "@/components/RolesAssign";

export default function SuperRolesScreen() {
  return (
    <RolesAssign
      title="People"
      badge="Super admin"
      header={<OfficeRolesSetup />}
    />
  );
}
