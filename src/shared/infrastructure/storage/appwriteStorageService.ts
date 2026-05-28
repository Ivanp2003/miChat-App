import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import { storage, APPWRITE_CONFIG } from "../appwrite/client";
import { ID } from "appwrite";

export async function uploadImage(
  fileUri: string,
  bucketId: string = APPWRITE_CONFIG.STORAGE_BUCKET_ID,
): Promise<string | null> {
  try {
    // Generate unique filename
    const fileExt = "jpg"; // we re-encode to JPEG below
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const fileId = ID.unique();

    // Compress and normalize image
    let workingUri = fileUri;
    const manipulated = await ImageManipulator.manipulateAsync(
      workingUri,
      [{ resize: { width: 1280 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
    );
    workingUri = manipulated.uri;

    // Validate file size using legacy API
    const info = await FileSystem.getInfoAsync(workingUri);
    if (
      "size" in info &&
      typeof (info as any).size === "number" &&
      (info as any).size > 7_000_000
    ) {
      return null;
    }

    // Convert URI to Uint8Array
    const base64 = await FileSystem.readAsStringAsync(workingUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const file = new File([bytes], fileName, { type: "image/jpeg" });

    // Upload to AppWrite Storage
    console.log("Uploading to bucket:", bucketId, "file:", fileName);

    const result = await storage.createFile(
      bucketId,
      fileId,
      file,
    );

    if (!result) {
      console.error("Upload error: No result returned");
      return null;
    }

    // Get file view URL
    const fileView = storage.getFileView(bucketId, fileId);

    return fileView.toString();
  } catch (error) {
    console.error("Error uploading image:", error);
    return null;
  }
}

export async function pickImage(): Promise<string | null> {
  // This will be implemented in the UI layer using expo-image-picker
  return null;
}
