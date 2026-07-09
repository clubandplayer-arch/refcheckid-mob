import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { colors, radii, spacing } from "@/lib/theme";

type ImagePreviewProps = Readonly<{
  accessibilityLabel: string;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  title: string;
  uri: string | null | undefined;
}>;

export function ImagePreview({
  accessibilityLabel,
  placeholder = "Nessuna immagine",
  style,
  title,
  uri,
}: ImagePreviewProps) {
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const safeUri = uri?.trim();
  useEffect(() => setFailed(false), [safeUri]);
  const canRenderImage = Boolean(safeUri) && !failed;
  return (
    <>
      <Pressable
        accessibilityLabel={canRenderImage ? `${accessibilityLabel}. Apri anteprima` : accessibilityLabel}
        accessibilityRole={canRenderImage ? "imagebutton" : "image"}
        disabled={!canRenderImage}
        onPress={() => setOpen(true)}
        style={[styles.frame, style]}
      >
        {canRenderImage ? (
          <Image onError={() => setFailed(true)} resizeMode="contain" source={{ uri: safeUri }} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>{placeholder}</Text>
          </View>
        )}
      </Pressable>
      <BottomSheet onClose={() => setOpen(false)} title={title} visible={open}>
        <View style={styles.previewFrame}>
          {canRenderImage ? <Image onError={() => setFailed(true)} resizeMode="contain" source={{ uri: safeUri }} style={styles.image} /> : <Text style={styles.placeholderText}>{placeholder}</Text>}
        </View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: "center",
    aspectRatio: 1,
    backgroundColor: colors.muted,
    borderRadius: radii.lg,
    justifyContent: "center",
    minHeight: 160,
    overflow: "hidden",
  },
  image: { height: "100%", width: "100%" },
  placeholder: { alignItems: "center", justifyContent: "center", padding: spacing.md },
  placeholderText: { color: colors.mutedForeground, fontSize: 14, fontWeight: "700", textAlign: "center" },
  previewFrame: {
    alignItems: "center",
    aspectRatio: 3 / 4,
    backgroundColor: colors.muted,
    borderRadius: radii.xl,
    justifyContent: "center",
    overflow: "hidden",
    width: "100%",
  },
});
