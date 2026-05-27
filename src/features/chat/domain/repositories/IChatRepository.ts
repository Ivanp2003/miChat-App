import { Message, Room, UserProfile } from "../entities/Message";

export interface IChatRepository {
  getRooms(userId: string): Promise<Room[]>;
  createRoom(
    name: string,
    createdBy: string,
    participantIds: string[],
  ): Promise<Room>;
  getUsers(excludeUserId: string): Promise<UserProfile[]>;
  getMessages(roomId: string): Promise<Message[]>;
  sendMessage(
    roomId: string,
    userId: string,
    content: string,
    imageUrl?: string,
  ): Promise<Message>;
  subscribeToRoom(
    roomId: string,
    onMessage: (msg: Message) => void,
  ): () => void;
  markRoomAsRead(roomId: string, userId: string): Promise<void>;
}
