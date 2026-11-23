import { useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { AuthGate } from "@/components/auth/auth-gate";
import { MobileScreen } from "@/components/ui/mobile-screen";
import { Notebook } from "@/features/referee/notebook";

export default function NotebookPage() {
  const { fixtureId } = useLocalSearchParams<{ fixtureId?: string }>();
  return (
    <AuthGate allowedRole="referee">
      <MobileScreen keyboardAvoiding>
        {fixtureId ? <Notebook key={fixtureId} fixtureId={fixtureId} /> : <Text>Seleziona una designazione.</Text>}
      </MobileScreen>
    </AuthGate>
  );
}
