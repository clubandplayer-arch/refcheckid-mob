import { ScrollView, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "@/lib/theme";

export type MobileTabItem<TKey extends string> = Readonly<{
  disabled?: boolean;
  key: TKey;
  label: string;
}>;

type MobileTabsProps<TKey extends string> = Readonly<{
  accessibilityLabel?: string;
  items: readonly MobileTabItem<TKey>[];
  onChange: (key: TKey) => void;
  value: TKey;
}>;

export function MobileTabs<TKey extends string>({
  accessibilityLabel,
  items,
  onChange,
  value,
}: MobileTabsProps<TKey>) {
  return (
    <ScrollView
      accessibilityLabel={accessibilityLabel}
      horizontal
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
    >
      <View style={styles.container}>
        {items.map((item) => {
          const selected = item.key === value;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ disabled: Boolean(item.disabled), selected }}
              disabled={item.disabled}
              key={item.key}
              onPress={() => onChange(item.key)}
              style={({ pressed }: { pressed: boolean }) => [
                styles.tab,
                selected ? styles.tabActive : null,
                item.disabled ? styles.tabDisabled : null,
                pressed && !item.disabled ? styles.tabPressed : null,
              ]}
            >
              <Text style={[styles.label, selected ? styles.labelActive : null]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", gap: spacing.sm },
  label: { color: colors.foreground, fontSize: 14, fontWeight: "700" },
  labelActive: { color: colors.white },
  tab: {
    alignItems: "center",
    backgroundColor: colors.muted,
    borderRadius: radii.lg,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  tabActive: { backgroundColor: colors.primary },
  tabDisabled: { opacity: 0.5 },
  tabPressed: { opacity: 0.9 },
});
