import { databases, APPWRITE_CONFIG } from "@shared/infrastructure/appwrite/client";
import { Query, ID } from "appwrite";
import { INotificationRepository } from "../../domain/repositories/INotificationRepository";

export class AppWriteNotificationRepository implements INotificationRepository {
  async savePushToken(userId: string, token: string): Promise<void> {
    try {
      // Verificar si ya existe un token para este usuario
      const existing = await databases.listDocuments(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.PUSH_TOKENS,
        [Query.equal("user_id", userId), Query.equal("token", token)]
      );

      if (existing.documents.length > 0) {
        // Ya existe, actualizar
        await databases.updateDocument(
          APPWRITE_CONFIG.DATABASE_ID,
          APPWRITE_CONFIG.COLLECTIONS.PUSH_TOKENS,
          existing.documents[0].$id,
          {
            updated_at: new Date().toISOString(),
          }
        );
      } else {
        // Crear nuevo token
        await databases.createDocument(
          APPWRITE_CONFIG.DATABASE_ID,
          APPWRITE_CONFIG.COLLECTIONS.PUSH_TOKENS,
          ID.unique(),
          {
            user_id: userId,
            token: token,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        );
      }
    } catch (error) {
      console.error("Error saving push token:", error);
      throw new Error("Could not save push token");
    }
  }
}
