import { supabase } from "@shared/infrastructure/supabase/client";
import { INotificationRepository } from "../../domain/repositories/INotificationRepository";

export class SupabaseNotificationRepository implements INotificationRepository {
  async savePushToken(userId: string, token: string): Promise<void> {
    const { error } = await supabase.from("push_tokens").upsert(
      {
        user_id: userId,
        token: token,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,token", // Composite key to prevent duplicates
      },
    );

    if (error) {
      console.error("Error saving push token:", error);
      throw new Error("Could not save push token");
    }
  }
}
