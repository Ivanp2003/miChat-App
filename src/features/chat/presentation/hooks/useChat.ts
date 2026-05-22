import { useAuthStore } from "@features/auth/presentation/store/authStore";
import { GetMessagesUseCase } from "@features/chat/application/use-cases/GetMessagesUseCase";
import { SendMessageUseCase } from "@features/chat/application/use-cases/SendMessageUseCase";
import { SubscribeToRoomUseCase } from "@features/chat/application/use-cases/SubscribeToRoomUseCase";
import { Message } from "@features/chat/domain/entities/Message";
import { SupabaseChatRepository } from "@features/chat/infrastructure/repositories/SupabaseChatRepository";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

const chatRepo = new SupabaseChatRepository();
const sendMessageUseCase = new SendMessageUseCase(chatRepo);
const getMessagesUseCase = new GetMessagesUseCase(chatRepo);
const subscribeUseCase = new SubscribeToRoomUseCase(chatRepo);

export function useChat(roomId: string | undefined) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  // Early return if roomId is undefined
  if (!roomId) {
    return {
      messages: [],
      sendMessage: () => {},
      isLoading: false,
      isSending: false,
    };
  }

  // Paso 1: obtener historial de mensajes con cache
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["messages", roomId], // Clave única por sala
    queryFn: () => getMessagesUseCase.execute(roomId),
    enabled: !!user,
    // Los mensajes antiguos no se revalidan automáticamente.
    // Realtime se encarga de los mensajes nuevos.
    staleTime: Infinity,
  });

  // Paso 2: suscribirse al canal Realtime
  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = subscribeUseCase.execute(roomId, (newMsg) => {
      queryClient.setQueryData(["messages", roomId], (old: Message[] = []) => {
        // Evitar duplicados: el optimistic update ya agregó este mensaje
        const exists = old.some((m) => m.id === newMsg.id);
        return exists ? old : [...old, newMsg];
      });

      // Show notification if message is from another user
      if (newMsg.userId !== user?.id && roomId) {
        // Dynamic import to prevent expo-notifications from loading in Expo Go
        import("@shared/infrastructure/notifications/notificationService")
          .then(({ showChatNotification }) => {
            showChatNotification(newMsg.authorUsername, newMsg.content, roomId);
          })
          .catch(() => {
            // Ignore if notifications not available (e.g., in Expo Go)
          });
      }
    });
    return unsubscribe; // Cleanup al desmontar: cierra el WebSocket
  }, [roomId, user?.id]);

  // Paso 3: enviar mensaje con optimistic update via useMutation
  const sendMutation = useMutation({
    mutationFn: async ({
      content,
      imageUri,
    }: {
      content: string;
      imageUri?: string;
    }) => {
      let imageUrl: string | undefined;

      // Upload image if provided
      if (imageUri) {
        const { uploadImage } =
          await import("@shared/infrastructure/storage/storageService");
        const uploadedUrl = await uploadImage(imageUri);
        imageUrl = uploadedUrl ?? undefined;
      }

      return sendMessageUseCase.execute(roomId, user!.id, content, imageUrl);
    },

    // onMutate se ejecuta ANTES de la petición (optimistic update)
    onMutate: async ({ content, imageUri }) => {
      const tempMsg: Message = {
        id: `temp-${Date.now()}`,
        roomId,
        userId: user!.id,
        content,
        imageUrl: imageUri, // Show local URI while uploading
        createdAt: new Date(),
        authorUsername: user!.username,
      };
      queryClient.setQueryData(["messages", roomId], (old: Message[] = []) => [
        ...old,
        tempMsg,
      ]);
      return { tempMsg }; // Contexto para onError
    },

    onSuccess: (realMsg, _variables, context) => {
      queryClient.setQueryData(["messages", roomId], (old: Message[] = []) =>
        old.map((m) => (m.id === context?.tempMsg.id ? realMsg : m)),
      );
    },

    onError: (_err, _variables, context) => {
      if (context?.tempMsg) {
        queryClient.setQueryData(["messages", roomId], (old: Message[] = []) =>
          old.filter((m) => m.id !== context.tempMsg.id),
        );
      }
    },
  });

  const sendMessage = async (content: string, imageUri?: string) => {
    await sendMutation.mutateAsync({ content, imageUri });
  };

  return {
    messages,
    sendMessage,
    isLoading,
    isSending: sendMutation.isPending,
  };
}
