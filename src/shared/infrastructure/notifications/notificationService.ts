import * as Notifications from "expo-notifications";

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

export async function requestNotificationPermissions() {
  const existingStatus = (await Notifications.getPermissionsAsync()) as any;
  let finalStatus = existingStatus;

  if (!existingStatus?.granted) {
    const requested = (await Notifications.requestPermissionsAsync()) as any;
    finalStatus = requested;
  }

  if (!finalStatus?.granted) {
    console.warn("Failed to get push notification permissions");
    return false;
  }

  return true;
}

export async function scheduleNotification(
  title: string,
  body: string,
  data?: any,
) {
  await Notifications.scheduleNotificationAsync({
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

export function setupNotificationListeners() {
  const subscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log("Notification received:", notification);
    },
  );

  const responseSubscription =
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log("Notification response:", response);
      // Handle navigation to chat room based on notification data
      const roomId = response.notification.request.content.data?.roomId;
      if (roomId) {
        // Navigate to chat room (implementation would go here)
        console.log("Navigate to room:", roomId);
      }
    });

  return { subscription, responseSubscription };
}
