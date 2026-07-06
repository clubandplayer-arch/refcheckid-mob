import { StyleSheet, Text, View } from "react-native";
import { AuthGate } from "@/components/auth/auth-gate";
import { Card } from "@/components/ui/card";
import { colors, spacing } from "@/lib/theme";

export default function FederationPage() {
  return (
    <AuthGate allowedRole="federation">
      <View style={styles.screen}>
        <Text style={styles.kicker}>Area Federazione</Text>
        <Text style={styles.title}>Cruscotto operativo</Text>
        <Card><Text style={styles.body}>Cruscotto federazione disponibile nelle Wave successive.</Text></Card>
      </View>
    </AuthGate>
  );
}
const styles = StyleSheet.create({ body:{color:colors.mutedForeground}, kicker:{color:colors.primary,fontWeight:"600"}, screen:{gap:spacing.lg,padding:spacing.xl}, title:{color:colors.foreground,fontSize:28,fontWeight:"700"} });
