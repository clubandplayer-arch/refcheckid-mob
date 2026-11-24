import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radii, spacing } from "@/lib/theme";
import { Button } from "@/components/ui/button";

type BottomSheetProps = Readonly<{
  children: ReactNode;
  onClose: () => void;
  title: string;
  visible: boolean;
}>;

export function BottomSheet({ children, onClose, title, visible }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.overlay}>
        <Pressable accessibilityLabel="Chiudi pannello" accessibilityRole="button" onPress={onClose} style={styles.backdrop} />
        <View
          accessibilityViewIsModal
          style={[styles.sheet, { paddingBottom: spacing.lg + insets.bottom }]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Button onPress={onClose}>Chiudi</Button>
          </View>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">{children}</ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  content: { gap: spacing.md },
  header: { alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  overlay: { backgroundColor: "rgba(15, 23, 42, 0.35)", flex: 1, justifyContent: "flex-end" },
  scroll: { flexShrink: 1 },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    gap: spacing.lg,
    maxHeight: "86%",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  title: { color: colors.foreground, flex: 1, fontSize: 18, fontWeight: "800" },
});
