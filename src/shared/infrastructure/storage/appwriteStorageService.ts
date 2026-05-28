export const uploadImage = async (bucketId: string, localUri: string) => {
  try {
    const filename = localUri.split('/').pop() || 'image.jpeg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    const formData = new FormData();
    formData.append('fileId', 'unique()'); 
    formData.append('file', {
      uri: localUri,
      name: filename,
      type: type,
    } as any);

    const response = await fetch(
      `https://nyc.cloud.appwrite.io/v1/storage/buckets/${bucketId}/files`,
      {
        method: 'POST',
        body: formData,
        headers: {
          'X-Appwrite-Project': '6a178edc000fed813891',
        },
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Error en la petición REST');
    }

    // Retornamos la URL limpia con el ID real que nos dio el servidor
    return `https://nyc.cloud.appwrite.io/v1/storage/buckets/${bucketId}/files/${result.$id}/preview?width=400&height=400&project=6a178edc000fed813891`;

  } catch (error) {
    console.error("Error en subida REST:", error);
    return null;
  }
};

export async function pickImage(): Promise<string | null> {
  // This will be implemented in the UI layer using expo-image-picker
  return null;
}
