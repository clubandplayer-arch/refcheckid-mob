import { StyleSheet, Text, View } from "react-native";
import { Button } from "./button";
import { Card } from "./card";
import { colors, radii, spacing } from "@/lib/theme";

export function SkeletonBlock() {
  return (
    <Card style={styles.skeletonCard} testID="skeleton-block">
      <View style={[styles.skeleton, styles.skeletonTitle]} />
      <View style={[styles.skeleton, styles.skeletonBody]} />
      <View style={[styles.skeleton, styles.skeletonLine]} />
    </Card>
  );
}

export function EmptyState({ message }: Readonly<{ message: string }>) {
  return <Text style={styles.empty}>{message}</Text>;
}

export function ErrorState({
  message,
  onRetry,
}: Readonly<{ message: string; onRetry?: () => void }>) {
  return (
    <Card style={styles.errorCard}>
      <Text style={styles.errorTitle}>Errore API</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      {onRetry ? (
        <Button onPress={onRetry} variant="danger">
          Riprova
        </Button>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  empty: {
    backgroundColor: colors.muted,
    borderRadius: radii.lg,
    color: colors.mutedForeground,
    fontSize: 14,
    padding: spacing.lg,
  },
  errorCard: {
    backgroundColor: colors.dangerBackground,
    borderColor: colors.dangerBorder,
    gap: spacing.md,
  },
  errorMessage: { color: "#450a0a", fontSize: 14 },
  errorTitle: { color: "#450a0a", fontSize: 16, fontWeight: "600" },
  skeleton: { backgroundColor: colors.muted, borderRadius: radii.md },
  skeletonBody: { height: 80, width: "100%" },
  skeletonCard: { gap: spacing.md },
  skeletonLine: { height: 16, width: "66%" },
  skeletonTitle: { height: 20, width: "33%" },
});
