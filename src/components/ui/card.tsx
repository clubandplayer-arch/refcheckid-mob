import type { ComponentProps } from "react";
import { StyleSheet, View } from "react-native";
import { colors, radii, spacing } from "@/lib/theme";

type CardProps = ComponentProps<typeof View>;

export function Card({ style, ...props }: CardProps) {
  return <View style={[styles.card, style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.xl,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
});
