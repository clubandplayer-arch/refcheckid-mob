import { IdentityHeader } from "@/features/auth/identity-header";
import { useLocalSearchParams } from "expo-router";
import { AuthGate } from "@/components/auth/auth-gate";
import { MobileScreen } from "@/components/ui/mobile-screen";
import { MatchSheetWorkflow } from "@/features/manager/match-sheet-workflow";

export default function ManagerMatchSheetPage() {
  const { matchId, clubId } = useLocalSearchParams<{ matchId?: string; clubId?: string }>();
  return (
    <AuthGate allowedRole="manager">
      <MobileScreen keyboardAvoiding>
        <IdentityHeader role="manager" clubId={clubId} />
        <MatchSheetWorkflow key={`${matchId}:${clubId}`} matchId={matchId ?? ""} clubId={clubId ?? ""} />
      </MobileScreen>
    </AuthGate>
  );
}
