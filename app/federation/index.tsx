import { Text } from "react-native";
import { AuthGate } from "@/components/auth/auth-gate";
import { MobileScreen } from "@/components/ui/mobile-screen";

export default function FederationPage() {
  return (
    <AuthGate allowedRole="federation">
      <MobileScreen>
        <Text>Per le attività federali e delle organizzazioni arbitrali usa il portale RefCheckID.</Text>
      </MobileScreen>
    </AuthGate>
  );
}
