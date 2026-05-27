import { INotificationRepository } from "../../domain/repositories/INotificationRepository";

export class SavePushTokenUseCase {
  constructor(private readonly notificationRepo: INotificationRepository) {}

  async execute(userId: string, token: string): Promise<void> {
    if (!userId || !token) {
      console.warn("userId and token are required to save push token");
      return;
    }
    return this.notificationRepo.savePushToken(userId, token);
  }
}
