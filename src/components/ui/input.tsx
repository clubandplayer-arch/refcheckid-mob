import type { ComponentProps } from "react";
import { StyleSheet, TextInput } from "react-native";
import { colors, radii, spacing } from "@/lib/theme";

type InputProps = ComponentProps<typeof TextInput>;

export function Input({ placeholderTextColor = colors.mutedForeground, style, ...props }: InputProps) {
  return (
    <TextInput
      placeholderTextColor={placeholderTextColor}
      style={[styles.input, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.foreground,
    fontSize: 14,
    minHeight: 42,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    width: "100%",
  },
});
