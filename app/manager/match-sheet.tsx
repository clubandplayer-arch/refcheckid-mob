import { AuthGate } from "@/components/auth/auth-gate";
import { MatchSheetWorkflow } from "@/features/manager/match-sheet-workflow";

export default function ManagerMatchSheetPage() {
  return (
    <AuthGate allowedRole="manager">
      <MatchSheetWorkflow />
    </AuthGate>
  );
}
