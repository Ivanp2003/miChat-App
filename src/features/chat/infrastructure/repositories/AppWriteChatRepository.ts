import { ID, Query } from "appwrite";
import {
    APPWRITE_CONFIG,
    databases,
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
      Query.contains("participant_ids", userId),
      Query.orderDesc("created_at"),
    ]);

    return response.documents.map((doc) => ({
      id: doc.$id,
      name: doc.name,
      createdBy: doc.created_by,
      createdAt: new Date(doc.created_at),
      unreadCount: doc.unread_count_mock || 0, // Manejado idealmente por Cloud Function
    }));
  }

  // Creación directa SIN permisos a nivel de documento.
  // Requiere que la colección rooms tenga:
  //   1. "Document Level Permissions" → DESHABILITADO
  //   2. Permisos de colección: read:users, create:users, update:users
  async createRoom(
    name: string,
    createdBy: string,
    participantIds: string[],
  ): Promise<Room> {
    const allParticipants = participantIds.includes(createdBy)
      ? participantIds
      : [...participantIds, createdBy];

    const participants = await databases.listDocuments(
      this.dbId,
      this.profilesColl,
      [Query.equal("$id", allParticipants.join(","))],
    );

    const roomId = ID.unique();
    const doc = await databases.createDocument(
      this.dbId,
      this.roomsColl,
      roomId,
      {
        name,
        created_by: createdBy,
        created_at: new Date().toISOString(),
        participant_ids: allParticipants,
        participant_details: JSON.stringify(
          participants.documents.map((p) => ({
            id: p.$id,
            username: p.username,
            avatar_url: p.avatar_url,
          })),
        ),
      },
    );

    return {
      id: doc.$id,
      name: doc.name,
      createdBy: doc.created_by,
      createdAt: new Date(doc.created_at),
      unreadCount: 0,
    };
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

    console.log("Saving message with image_url:", imageUrl);
    console.log("Full messageData:", messageData);

    // Nota: Los permisos de lectura de este mensaje se heredan o se restringen a los miembros de la sala
    const doc = await databases.createDocument(
      this.dbId,
      this.messagesColl,
      messageId,
      messageData,
    );

    console.log("Document saved with image_url:", doc.image_url);

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
