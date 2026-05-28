import { ExecutionMethod, ID, Query } from "appwrite";
import {
    APPWRITE_CONFIG,
    databases,
    functions,
} from "../../../../shared/infrastructure/appwrite/client";
import { Message, Room, UserProfile } from "../../domain/entities/Message";
import { IChatRepository } from "../../domain/repositories/IChatRepository";

export class AppWriteChatRepository implements IChatRepository {
  private dbId = APPWRITE_CONFIG.DATABASE_ID;
  private roomsColl = APPWRITE_CONFIG.COLLECTIONS.ROOMS;
  private messagesColl = APPWRITE_CONFIG.COLLECTIONS.MESSAGES;
  private profilesColl = APPWRITE_CONFIG.COLLECTIONS.PROFILES;

  // Obtener salas usando Desnormalización (Query por Array)
  async getRooms(userId: string): Promise<Room[]> {
    const response = await databases.listDocuments(this.dbId, this.roomsColl, [
      Query.equal("participant_ids", userId),
      Query.orderDesc("updated_at"),
    ]);

    return response.documents.map((doc) => ({
      id: doc.$id,
      name: doc.name,
      createdBy: doc.created_by,
      createdAt: new Date(doc.created_at),
      unreadCount: doc.unread_count_mock || 0, // Manejado idealmente por Cloud Function
    }));
  }

  // Creación de sala via Cloud Function (server-side) para asignar permisos
  // a TODOS los participantes. Desde el cliente SDK no se permite asignar
  // permisos a otros usuarios (restricción de seguridad de AppWrite).
  async createRoom(
    name: string,
    createdBy: string,
    participantIds: string[],
  ): Promise<Room> {
    // Asegurar que el creador esté incluido en los participantes
    const allParticipants = participantIds.includes(createdBy)
      ? participantIds
      : [...participantIds, createdBy];

    const execution = await functions.createExecution(
      APPWRITE_CONFIG.FUNCTIONS.CREATE_ROOM,
      JSON.stringify({ name, createdBy, participantIds: allParticipants }),
      false,
      "/",
      ExecutionMethod.POST,
    );

    const result = JSON.parse(execution.responseBody);

    if (!result.success) {
      throw new Error(result.error || "Error creating room via function");
    }

    return result.room;
  }

  async getMessages(roomId: string): Promise<Message[]> {
    const response = await databases.listDocuments(
      this.dbId,
      this.messagesColl,
      [
        Query.equal("room_id", roomId),
        Query.orderAsc("created_at"),
        Query.limit(100),
      ],
    );

    // Obtener usernames de los autores
    const userIds = [...new Set(response.documents.map((doc) => doc.user_id))];
    const profiles = await databases.listDocuments(
      this.dbId,
      this.profilesColl,
      [Query.equal("$id", userIds.join(","))],
    );

    const profileMap = new Map(
      profiles.documents.map((p) => [p.$id, p.username]),
    );

    return response.documents.map((doc) => ({
      id: doc.$id,
      roomId: doc.room_id,
      userId: doc.user_id,
      content: doc.content,
      imageUrl: doc.image_url,
      createdAt: new Date(doc.created_at),
      authorUsername: profileMap.get(doc.user_id),
    }));
  }

  async sendMessage(
    roomId: string,
    userId: string,
    content: string,
    imageUrl?: string,
  ): Promise<Message> {
    const messageId = ID.unique();

    const messageData = {
      room_id: roomId,
      user_id: userId,
      content,
      image_url: imageUrl,
      created_at: new Date().toISOString(),
    };

    // Nota: Los permisos de lectura de este mensaje se heredan o se restringen a los miembros de la sala
    const doc = await databases.createDocument(
      this.dbId,
      this.messagesColl,
      messageId,
      messageData,
    );

    // Obtener username del autor
    const profile = await databases.getDocument(
      this.dbId,
      this.profilesColl,
      userId,
    );

    return {
      id: doc.$id,
      roomId: doc.room_id,
      userId: doc.user_id,
      content: doc.content,
      imageUrl: doc.image_url,
      createdAt: new Date(doc.created_at),
      authorUsername: profile.username,
    };
  }

  async getUsers(excludeUserId: string): Promise<UserProfile[]> {
    const response = await databases.listDocuments(
      this.dbId,
      this.profilesColl,
      [Query.notEqual("$id", excludeUserId)],
    );

    return response.documents.map((doc) => ({
      id: doc.$id,
      username: doc.username,
    }));
  }

  async markRoomAsRead(roomId: string, userId: string): Promise<void> {
    // Buscar el documento de room_participants del usuario
    const response = await databases.listDocuments(
      this.dbId,
      APPWRITE_CONFIG.COLLECTIONS.ROOM_PARTICIPANTS,
      [Query.equal("room_id", roomId), Query.equal("user_id", userId)],
    );

    if (response.documents.length > 0) {
      await databases.updateDocument(
        this.dbId,
        APPWRITE_CONFIG.COLLECTIONS.ROOM_PARTICIPANTS,
        response.documents[0].$id,
        { last_read_at: new Date().toISOString() },
      );
    }
  }

  // Realtime deshabilitado: WebSocket de AppWrite roto con Hermes/Expo Cloud.
  // Los mensajes en tiempo real llegan vía push notifications → invalidación de React Query.
  subscribeToRoom(
    _roomId: string,
    _onMessage: (message: Message) => void,
  ): () => void {
    return () => {};
  }
}
