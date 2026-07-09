import { AuthGate } from "@/components/auth/auth-gate";
import { MobileScreen } from "@/components/ui/mobile-screen";
import { MatchSheetWorkflow } from "@/features/manager/match-sheet-workflow";

export default function ManagerMatchSheetPage() {
  return (
    <AuthGate allowedRole="manager">
      <MobileScreen keyboardAvoiding>
        <MatchSheetWorkflow />
      </MobileScreen>
    </AuthGate>
  );
}
