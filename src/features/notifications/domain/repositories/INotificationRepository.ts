export interface INotificationRepository {
  savePushToken(userId: string, token: string): Promise<void>;
}
