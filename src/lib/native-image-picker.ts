import * as ImagePicker from "expo-image-picker";

export type NativePhotoDraft = {
  readonly dataUrl: string;
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

async function pickPhoto(launch: () => Promise<ImagePicker.ImagePickerResult>): Promise<NativePhotoDraft | null> {
  const result = await launch();
  if (result.canceled) return null;
  const asset = result.assets?.[0];
  if (!asset?.uri || !asset.base64) throw new Error("Immagine non disponibile.");
  // ImagePicker returns JPEG data when base64 is requested.
  return {
    dataUrl: `data:image/jpeg;base64,${asset.base64}`,
    mimeType: "image/jpeg",
    previewUrl: asset.uri,
    sizeBytes: Math.floor(asset.base64.length * 3 / 4) - (asset.base64.endsWith("==") ? 2 : asset.base64.endsWith("=") ? 1 : 0),
  };
}

function buildImagePickerOptions(): ImagePicker.ImagePickerOptions {
  return {
    allowsEditing: true,
    base64: true,
    mediaTypes: ["images"],
    quality: 0.9,
  };
}
