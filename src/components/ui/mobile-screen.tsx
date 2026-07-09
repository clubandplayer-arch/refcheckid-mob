import { type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing } from "@/lib/theme";

type MobileScreenProps = Readonly<{
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  keyboardAvoiding?: boolean;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}>;

export function MobileScreen({
  children,
  contentStyle,
  keyboardAvoiding = false,
  scroll = true,
  style,
  testID,
}: MobileScreenProps) {
  const insets = useSafeAreaInsets();
  const contentPadding = {
    paddingBottom: spacing.xl + insets.bottom,
    paddingLeft: spacing.xl + insets.left,
    paddingRight: spacing.xl + insets.right,
    paddingTop: spacing.xl,
  };
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, contentPadding, contentStyle]}
      keyboardShouldPersistTaps="handled"
      testID={testID ? `${testID}-scroll` : undefined}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.flex, contentPadding, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={[styles.safeArea, style]} testID={testID}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
          style={styles.flex}
        >
          {content}
        </KeyboardAvoidingView>
      ) : content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: spacing.lg },
  flex: { flex: 1 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
});
