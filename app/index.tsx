import { StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/ui/card";
import { colors, spacing } from "@/lib/theme";

export default function Index() {
  return (
    <View style={styles.screen}>
      <Card>
        <Text style={styles.kicker}>RefCheckID Mobile</Text>
        <Text style={styles.title}>Fondazioni applicative</Text>
        <Text style={styles.body}>Wave 1: shell, provider e design system minimo.</Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { color: colors.mutedForeground, fontSize: 14, marginTop: spacing.sm },
  kicker: { color: colors.primary, fontSize: 14, fontWeight: "600" },
  screen: { backgroundColor: colors.muted, flex: 1, justifyContent: "center", padding: spacing.xl },
  title: { color: colors.foreground, fontSize: 28, fontWeight: "700", marginTop: spacing.xs },
});
