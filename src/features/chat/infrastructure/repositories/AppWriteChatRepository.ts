import { ID, Permission, Query, Role } from "appwrite";
import {
    APPWRITE_CONFIG,
    databases,
    realtime,
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

  // Creación de sala inyectando Permisos a Nivel de Documento y Metadata de perfiles
  async createRoom(
    name: string,
    createdBy: string,
    participantIds: string[],
  ): Promise<Room> {
    const roomId = ID.unique();

    // Generar permisos explícitos de lectura/escritura para cada participante
    const docPermissions = participantIds.map((id) =>
      Permission.read(Role.user(id)),
    );
    docPermissions.push(
      ...participantIds.map((id) => Permission.write(Role.user(id))),
    );

    // Obtener detalles de los participantes para desnormalizar
    const participants = await databases.listDocuments(
      this.dbId,
      this.profilesColl,
      [Query.equal("$id", participantIds.join(","))],
    );

    const roomData = {
      name,
      created_by: createdBy,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      participant_ids: participantIds,
      // Desnormalizamos la info de perfil crucial para pintarla en el feed sin hacer JOINs
      participant_details: JSON.stringify(
        participants.documents.map((p) => ({
          id: p.$id,
          username: p.username,
          avatar_url: p.avatar_url,
        })),
      ),
    };

    const doc = await databases.createDocument(
      this.dbId,
      this.roomsColl,
      roomId,
      roomData,
      docPermissions,
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

  // Suscripción Realtime Global + Filtro Funcional en Cliente
  subscribeToRoom(
    roomId: string,
    onMessage: (message: Message) => void,
  ): () => void {
    const channel = `databases.${this.dbId}.collections.${this.messagesColl}.documents`;

    let subscription: any = null;

    realtime
      .subscribe(channel, (response) => {
        // Validamos que el evento sea de creación de un documento
        if (response.events.some((e) => e.includes(".create"))) {
          const payload = response.payload as any;

          // FILTRADO EN CLIENTE CRÍTICO: Comprobamos si pertenece a la sala actual
          if (payload.room_id === roomId) {
            onMessage({
              id: payload.$id,
              roomId: payload.room_id,
              userId: payload.user_id,
              content: payload.content,
              imageUrl: payload.image_url,
              createdAt: new Date(payload.created_at),
            });
          }
        }
      })
      .then((sub) => {
        subscription = sub;
      });

    // Retorna la función de des-suscripción para el ciclo de vida del Hook de React
    return () => {
      if (subscription) {
        subscription.close();
      }
    };
  }
}
