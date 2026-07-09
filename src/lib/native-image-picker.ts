import * as ImagePicker from "expo-image-picker";

type ImagePickerAsset = {
  readonly base64?: string | null;
  readonly fileSize?: number | null;
  readonly mimeType?: string | null;
  readonly type?: string | null;
  readonly uri?: string | null;
};

type ImagePickerResult = {
  readonly assets?: readonly ImagePickerAsset[] | null;
  readonly canceled?: boolean;
};

export type NativePhotoDraft = {
  readonly mimeType: string;
  readonly previewUrl: string;
  readonly sizeBytes: number;
};

export async function takePhotoWithCamera(): Promise<NativePhotoDraft | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync?.();
  if (permission && !permission.granted) throw new Error("Autorizza l’uso della fotocamera per scattare una foto.");
  return pickPhoto(() => ImagePicker.launchCameraAsync(buildImagePickerOptions()));
}

export async function choosePhotoFromLibrary(): Promise<NativePhotoDraft | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync?.();
  if (permission && !permission.granted) throw new Error("Autorizza l’accesso alla galleria per scegliere una foto.");
  return pickPhoto(() => ImagePicker.launchImageLibraryAsync(buildImagePickerOptions()));
}

async function pickPhoto(launch: () => Promise<ImagePickerResult>): Promise<NativePhotoDraft | null> {
  const result = await launch();
  if (result.canceled) return null;
  const asset = result.assets?.[0];
  if (!asset?.uri) return null;
  return {
    mimeType: asset.mimeType ?? inferMimeType(asset.uri, asset.type),
    previewUrl: asset.base64 ? `data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}` : asset.uri,
    sizeBytes: asset.fileSize ?? 0,
  };
}

function buildImagePickerOptions() {
  return {
    allowsEditing: true,
    base64: true,
    mediaTypes: ["images"],
    quality: 0.9,
  };
}

function inferMimeType(uri: string, assetType?: string | null): string {
  if (assetType?.startsWith("image/")) return assetType;
  const extension = uri.split("?")[0]?.split(".").at(-1)?.toLowerCase();
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "heic" || extension === "heif") return "image/heic";
  return "image/jpeg";
}
