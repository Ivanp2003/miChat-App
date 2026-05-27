import { useAuthStore } from "@features/auth/presentation/store/authStore";
import { SavePushTokenUseCase } from "@features/notifications/application/use-cases/SavePushTokenUseCase";
import { SupabaseNotificationRepository } from "@features/notifications/infrastructure/repositories/SupabaseNotificationRepository";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Alert, Platform } from "react-native";

type NotificationsModule = typeof import("expo-notifications");

const isExpoGo = Constants.executionEnvironment === "storeClient";

async function registerForPushNotificationsAsync(
  Notifications: NotificationsModule,
): Promise<string | undefined> {
  let token;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    Alert.alert(
      "Permiso denegado",
      "No se pudo obtener el token para notificaciones push.",
    );
    return;
  }

  try {
    token = (
      await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      })
    ).data;
  } catch (e) {
    console.error("Error getting push token", e);
  }

  return token;
}

export const usePushNotifications = () => {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const notificationListener =
    useRef<
      ReturnType<NotificationsModule["addNotificationReceivedListener"]>
    >();
  const responseListener =
    useRef<
      ReturnType<NotificationsModule["addNotificationResponseReceivedListener"]>
    >();

  useEffect(() => {
    if (!user || isExpoGo) return;

    let isMounted = true;

    const setup = async () => {
      const Notifications = await import("expo-notifications");

      if (!isMounted) return;

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      const notificationRepo = new SupabaseNotificationRepository();
      const savePushTokenUseCase = new SavePushTokenUseCase(notificationRepo);

      const token = await registerForPushNotificationsAsync(Notifications);
      if (token) {
        savePushTokenUseCase.execute(user.id, token);
      }

      notificationListener.current =
        Notifications.addNotificationReceivedListener((notification) => {
          console.log("Notification received:", notification);
        });

      responseListener.current =
        Notifications.addNotificationResponseReceivedListener((response) => {
          const roomId = response.notification.request.content.data
            ?.roomId as string;
          if (roomId) {
            router.push(`/chat/${roomId}`);
          }
        });
    };

    setup();

    return () => {
      isMounted = false;
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [user, router]);
};
