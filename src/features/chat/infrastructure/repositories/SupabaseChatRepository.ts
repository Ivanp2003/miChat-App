import {
    Message,
    Room,
    UserProfile,
} from "@features/chat/domain/entities/Message";
import { IChatRepository } from "@features/chat/domain/repositories/IChatRepository";
import { supabase } from "@shared/infrastructure/supabase/client";
export class SupabaseChatRepository implements IChatRepository {
  async getRooms(userId: string): Promise<Room[]> {
    const { data, error } = await supabase
      .from("room_participants")
      .select(
        "room_id, last_read_at, joined_at, rooms(id, name, created_by, created_at)",
      )
      .eq("user_id", userId)
      .order("joined_at", { ascending: false });
    if (error) throw error;

    const baseRooms = (data ?? []).map((row: any) => ({
      room: this.mapRoom(row.rooms),
      lastReadAt: row.last_read_at as string | null,
    }));

    const roomsWithUnread = await Promise.all(
      baseRooms.map(async ({ room, lastReadAt }) => {
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("room_id", room.id)
          .neq("user_id", userId)
          .gt("created_at", lastReadAt ?? "1970-01-01T00:00:00Z");
        return { ...room, unreadCount: count ?? 0 } as Room;
      }),
    );

    return roomsWithUnread;
  }

  async createRoom(
    name: string,
    createdBy: string,
    participantIds: string[],
  ): Promise<Room> {
    const { data, error } = await supabase
      .from("rooms")
      .insert({ name, created_by: createdBy })
      .select()
      .single();
    if (error) throw error;
    const room = this.mapRoom(data);

    // Insert all participants including creator
    const allParticipantIds = [
      createdBy,
      ...participantIds.filter((id) => id !== createdBy),
    ];
    const participants = allParticipantIds.map((userId) => ({
      room_id: room.id,
      user_id: userId,
    }));
    await supabase.from("room_participants").insert(participants);

    return room;
  }

  async getUsers(excludeUserId: string): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username")
      .neq("id", excludeUserId)
      .order("username", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      username: row.username,
    }));
  }

  async getMessages(roomId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from("messages")
      .select("id, room_id, user_id, content, image_url, created_at")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(50);
    if (error) throw error;

    // Fetch usernames for all messages
    const userIds = [...new Set((data ?? []).map((m) => m.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", userIds);
    const usernameMap = new Map(profiles?.map((p) => [p.id, p.username]) ?? []);

    return (data ?? []).map((msg) => ({
      id: msg.id,
      roomId: msg.room_id,
      userId: msg.user_id,
      content: msg.content,
      imageUrl: msg.image_url,
      createdAt: new Date(msg.created_at),
      authorUsername: usernameMap.get(msg.user_id),
    }));
  }

  async sendMessage(
    roomId: string,
    userId: string,
    content: string,
    imageUrl?: string,
  ): Promise<Message> {
    const { data, error } = await supabase
      .from("messages")
      .insert({
        room_id: roomId,
        user_id: userId,
        content,
        image_url: imageUrl,
      })
      .select("id, room_id, user_id, content, image_url, created_at")
      .single();
    if (error) throw error;

    // Fetch username for the sent message
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .single();

    return {
      id: data.id,
      roomId: data.room_id,
      userId: data.user_id,
      content: data.content,
      imageUrl: data.image_url,
      createdAt: new Date(data.created_at),
      authorUsername: profile?.username,
    };
  }

  subscribeToRoom(
    roomId: string,
    onMessage: (msg: Message) => void,
  ): () => void {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          // El payload no incluye el username — se obtiene con una query extra
          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", payload.new.user_id)
            .single();
          onMessage({
            id: payload.new.id,
            roomId: payload.new.room_id,
            userId: payload.new.user_id,
            content: payload.new.content,
            imageUrl: payload.new.image_url,
            createdAt: new Date(payload.new.created_at),
            authorUsername: profile?.username,
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  async markRoomAsRead(roomId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from("room_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("room_id", roomId)
      .eq("user_id", userId);
    if (error) throw error;
  }

  private mapRoom = (raw: any): Room => ({
    id: raw.id,
    name: raw.name,
    createdBy: raw.created_by,
    createdAt: new Date(raw.created_at),
  });

  private mapMessage = (raw: any): Message => ({
    id: raw.id,
    roomId: raw.room_id,
    userId: raw.user_id,
    content: raw.content,
    imageUrl: raw.image_url,
    createdAt: new Date(raw.created_at),
    authorUsername: raw.profiles?.username,
  });
}
