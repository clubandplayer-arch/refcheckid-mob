import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { useRef, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorState, SkeletonBlock } from "@/components/ui/state";
import { choosePhotoFromLibrary } from "@/lib/native-image-picker";
import { request } from "@/lib/api-client";
import { resolveRenderablePhotoUrl } from "@/lib/photo-url";
import { useApiMutation, useApiQuery, useInvalidateQueries } from "@/lib/query";
import { useSession } from "@/lib/session";
import { colors, spacing } from "@/lib/theme";

interface Identity {
  kind: "club" | "referee" | "organization";
  subjectId: string;
  federationId?: string | null;
  displayName: string;
  primaryColor: string;
  imageUrl: string | null;
  imageSource?: string;
  canEdit: boolean;
  revision: number;
  description: string;
  website: string;
}

export function IdentityHeader({ role, clubId }: { role: "manager" | "referee"; clubId?: string }) {
  const { session } = useSession();
  const [target, setTarget] = useState<Identity | null>(null);
  const query = useApiQuery(["identity-profiles", session?.user.id], () =>
    request<{ items: Identity[] }>("/platform/profiles/context"), {
    enabled: !!session,
    retry: false,
  });
  const items = query.data?.items ?? [];
  const accessible = items.filter((item) => item.kind === (role === "manager" ? "club" : "referee") && (!clubId || item.subjectId === clubId));
  const own = accessible[0];
  const organization = items.find((item) => item.kind === "organization" && item.subjectId === own?.federationId);
  if (!own) return null;
  return (
    <View style={styles.container}>
      <IdentityRow identity={own} />
      {organization ? <IdentityRow identity={organization} caption="Federazione di appartenenza" /> : null}
      {accessible.filter((item) => item.canEdit).map((item) => (
        <Button key={item.subjectId} onPress={() => setTarget(item)}>Modifica profilo · {item.displayName}</Button>
      ))}
      {target ? <IdentityEditor key={target.subjectId} target={target} close={() => setTarget(null)} /> : null}
    </View>
  );
}

function IdentityRow({ identity, caption }: { identity: Identity; caption?: string }) {
  const imageUrl = resolveRenderablePhotoUrl(identity.imageUrl);
  const borderColor = /^#[0-9a-f]{6}$/i.test(identity.primaryColor) ? identity.primaryColor : colors.border;
  return (
    <View style={[styles.row, { borderColor }]}>
      <View style={styles.label}>
        {caption ? <Text>{caption}</Text> : null}
        <Text style={styles.name}>{identity.displayName}</Text>
      </View>
      {imageUrl ? <Image accessibilityLabel={identity.displayName} source={{ uri: imageUrl }} resizeMode="contain" style={caption ? styles.federationLogo : styles.mainLogo} /> : null}
    </View>
  );
}

function IdentityEditor({ target, close }: { target: Identity; close: () => void }) {
  const path = `/platform/profiles/${target.kind}/${encodeURIComponent(target.subjectId)}`;
  const query = useApiQuery(["identity-profile", target.kind, target.subjectId], () => request<Identity>(path), { retry: false });
  return (
    <BottomSheet visible onClose={close} title="Profilo e identità visiva">
      {query.isLoading ? <SkeletonBlock /> : null}
      {query.isError ? <ErrorState message={query.error.message} onRetry={() => void query.refetch()} /> : null}
      {query.data ? <IdentityForm key={query.data.revision} profile={query.data} path={path} reload={() => void query.refetch()} close={close} /> : null}
    </BottomSheet>
  );
}

function IdentityForm({ profile, path, reload, close }: {
  profile: Identity; path: string; reload: () => void; close: () => void;
}) {
  const invalidate = useInvalidateQueries();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [description, setDescription] = useState(profile.description);
  const [website, setWebsite] = useState(profile.website);
  const [image, setImage] = useState<string>();
  const [removeImage, setRemoveImage] = useState(false);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const saving = useRef(false);
  const logoLocked = profile.kind === "club" && profile.imageSource === "federation" && !!profile.imageUrl;
  const preview = removeImage ? null : image ?? resolveRenderablePhotoUrl(profile.imageUrl);
  const save = useApiMutation(() => request(path, {
    method: "POST",
    body: JSON.stringify({
      section: "profile", revision: profile.revision, displayName, description, website,
      ...(image ? { imageBase64: image } : {}), removeImage,
    }),
  }), {
    async onSuccess() {
      await Promise.all([invalidate(["identity-profiles"]), invalidate(["identity-profile", profile.kind, profile.subjectId])]);
      close();
    },
  });
  const editable = profile.canEdit && !processing && !save.isPending;

  async function chooseImage() {
    setProcessing(true);
    setError("");
    try {
      const picked = await choosePhotoFromLibrary();
      if (!picked) return;
      const size = await Image.getSize(picked.previewUrl);
      const context = ImageManipulator.manipulate(picked.previewUrl);
      if (Math.max(size.width, size.height) > 640) context.resize(size.width >= size.height ? { width: 640 } : { height: 640 });
      const rendered = await context.renderAsync();
      const result = await rendered.saveAsync({ format: SaveFormat.WEBP, compress: 0.85, base64: true });
      const data = `data:image/webp;base64,${result.base64 ?? ""}`;
      if (!result.base64 || data.length > 700_000) throw new Error("Immagine troppo grande per il profilo.");
      setImage(data);
      setRemoveImage(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Immagine non disponibile.");
    } finally {
      setProcessing(false);
    }
  }

  function submit() {
    if (saving.current) return;
    saving.current = true;
    void save.mutateAsync().catch(() => undefined).finally(() => { saving.current = false; });
  }

  return (
    <View style={styles.container}>
      {preview ? <Image accessibilityLabel="Anteprima del profilo" source={{ uri: preview }} style={styles.mainLogo} resizeMode="contain" /> : null}
      {logoLocked ? <Text>Il logo federale si modifica dal portale.</Text> : (
        <>
          <Button disabled={!editable} onPress={() => void chooseImage()}>Scegli immagine</Button>
          {preview ? <Button disabled={!editable} onPress={() => { setImage(undefined); setRemoveImage(true); }}>Rimuovi immagine</Button> : null}
        </>
      )}
      <Text>Nome visualizzato</Text>
      <Input accessibilityLabel="Nome visualizzato" maxLength={120} editable={editable} value={displayName} onChangeText={setDisplayName} />
      <Text>Presentazione</Text>
      <Input accessibilityLabel="Presentazione" multiline maxLength={1000} editable={editable} value={description} onChangeText={setDescription} />
      <Text>Sito web</Text>
      <Input accessibilityLabel="Sito web" autoCapitalize="none" keyboardType="url" maxLength={300} editable={editable} value={website} onChangeText={setWebsite} />
      {error || save.isError ? <Text accessibilityRole="alert">{error || save.error?.message}</Text> : null}
      {save.isError ? <Button onPress={reload}>Ricarica profilo dal server</Button> : null}
      <Button disabled={!editable || !displayName.trim()} onPress={submit}>Salva profilo</Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.sm, borderBottomWidth: 2 },
  label: { flex: 1 },
  name: { fontWeight: "700", color: colors.foreground },
  mainLogo: { width: 80, height: 80 },
  federationLogo: { width: 64, height: 64 },
});
