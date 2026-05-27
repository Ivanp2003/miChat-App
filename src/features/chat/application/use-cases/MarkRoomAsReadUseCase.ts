import { IChatRepository } from "@features/chat/domain/repositories/IChatRepository";

export class MarkRoomAsReadUseCase {
  constructor(private readonly chatRepo: IChatRepository) {}
  async execute(roomId: string, userId: string): Promise<void> {
    return this.chatRepo.markRoomAsRead(roomId, userId);
  }
}
