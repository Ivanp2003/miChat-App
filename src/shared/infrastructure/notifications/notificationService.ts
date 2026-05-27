import Constants from "expo-constants";

let Notifications: any = null;
let isInitialized = false;

async function ensureNotifications() {
  if (isInitialized) return Notifications;

  // Skip in Expo Go
  if (Constants.executionEnvironment === "storeClient") {
    return null;
  }

  try {
    const module = await import("expo-notifications");
    Notifications = module.default;

    // Configure notification behavior
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    isInitialized = true;
    return Notifications;
  } catch (error) {
    console.warn("expo-notifications not available:", error);
    return null;
  }
}

export async function requestNotificationPermissions() {
  const NotificationsModule = await ensureNotifications();
  if (!NotificationsModule) return false;

  const existingStatus = await NotificationsModule.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (!existingStatus.granted) {
    const requested = await NotificationsModule.requestPermissionsAsync();
    finalStatus = requested;
  }

  if (!finalStatus.granted) {
    console.warn("Failed to get push notification permissions");
    return false;
  }

  return true;
}

export async function scheduleNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
) {
  const NotificationsModule = await ensureNotifications();
  if (!NotificationsModule) return;

  await NotificationsModule.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: null, // Show immediately
  });
}

export async function showChatNotification(
  username: string,
  message: string,
  roomId: string,
) {
  await scheduleNotification(`Nuevo mensaje de ${username}`, message, {
    roomId,
    type: "chat_message",
  });
}

export async function setupNotificationListeners() {
  const NotificationsModule = await ensureNotifications();
  if (!NotificationsModule)
    return { subscription: null, responseSubscription: null };

  const subscription = NotificationsModule.addNotificationReceivedListener(
    (notification: any) => {
      console.log("Notification received:", notification);
    },
  );

  const responseSubscription =
    NotificationsModule.addNotificationResponseReceivedListener(
      (response: any) => {
        console.log("Notification response:", response);
        // Handle navigation to chat room based on notification data
        const roomId = response.notification.request.content.data?.roomId;
        if (roomId) {
          // Navigate to chat room (implementation would go here)
          console.log("Navigate to room:", roomId);
        }
      },
    );

  return { subscription, responseSubscription };
}
