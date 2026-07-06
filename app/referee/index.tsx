import { StyleSheet, Text, View } from "react-native";
import { AuthGate } from "@/components/auth/auth-gate";
import { Card } from "@/components/ui/card";
import { colors, spacing } from "@/lib/theme";

export default function RefereePage() {
  return (
    <AuthGate allowedRole="referee">
      <View style={styles.screen}>
        <Text style={styles.kicker}>Area Arbitro</Text>
        <Text style={styles.title}>Dashboard</Text>
        <Card><Text style={styles.body}>Dashboard arbitro disponibile nelle Wave successive.</Text></Card>
      </View>
    </AuthGate>
  );
}
const styles = StyleSheet.create({ body:{color:colors.mutedForeground}, kicker:{color:colors.primary,fontWeight:"600"}, screen:{gap:spacing.lg,padding:spacing.xl}, title:{color:colors.foreground,fontSize:28,fontWeight:"700"} });
