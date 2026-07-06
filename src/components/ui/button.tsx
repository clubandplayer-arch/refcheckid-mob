import type { ComponentProps, ReactNode } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { colors, radii, spacing } from "@/lib/theme";

type ButtonProps = Omit<ComponentProps<typeof Pressable>, "children"> & {
  children: ReactNode;
  variant?: "primary" | "danger";
};

export function Button({ children, disabled, style, variant = "primary", ...props }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }: { pressed: boolean }) => [
        styles.button,
        variant === "danger" ? styles.danger : styles.primary,
        disabled ? styles.disabled : null,
        pressed && !disabled ? styles.pressed : null,
        typeof style === "function" ? style({ pressed }) : style,
      ]}
      {...props}
    >
      <Text style={styles.label}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: radii.md,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  danger: { backgroundColor: colors.danger },
  disabled: { opacity: 0.5 },
  label: { color: colors.white, fontSize: 14, fontWeight: "600" },
  pressed: { opacity: 0.9 },
  primary: { backgroundColor: colors.primary },
});
