import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import { supabase } from "../supabase/client";

export async function uploadImage(
  fileUri: string,
  bucketName: string = "chat-images",
): Promise<string | null> {
  try {
    // Generate unique filename
    const fileExt = "jpg"; // we re-encode to JPEG below
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${fileName}`;

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

    // Upload to Supabase Storage
    console.log("Uploading to bucket:", bucketName, "file:", filePath);

    const { error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, bytes, {
        contentType: `image/jpeg`,
        upsert: true,
      });

    if (error) {
      console.error("Upload error:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      return null;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucketName).getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error("Error uploading image:", error);
    return null;
  }
}

export async function pickImage(): Promise<string | null> {
  // This will be implemented in the UI layer using expo-image-picker
  return null;
}
