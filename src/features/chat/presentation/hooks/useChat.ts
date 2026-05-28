import { useAuthStore } from "@features/auth/presentation/store/authStore";
import { GetMessagesUseCase } from "@features/chat/application/use-cases/GetMessagesUseCase";
import { MarkRoomAsReadUseCase } from "@features/chat/application/use-cases/MarkRoomAsReadUseCase";
import { SendMessageUseCase } from "@features/chat/application/use-cases/SendMessageUseCase";
import { Message, Room } from "@features/chat/domain/entities/Message";
import { AppWriteChatRepository } from "@features/chat/infrastructure/repositories/AppWriteChatRepository";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

const chatRepo = new AppWriteChatRepository();
const sendMessageUseCase = new SendMessageUseCase(chatRepo);
const getMessagesUseCase = new GetMessagesUseCase(chatRepo);
const markReadUseCase = new MarkRoomAsReadUseCase(chatRepo);

export function useChat(roomId: string | undefined) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  // Paso 1: obtener historial de mensajes con cache
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["messages", roomId], // Clave única por sala
    queryFn: () =>
      roomId ? getMessagesUseCase.execute(roomId) : Promise.resolve([]),
    enabled: !!user && !!roomId,
    // Los mensajes nuevos llegan vía push notifications → invalidación de queries.
    staleTime: Infinity,
  });

  // Los mensajes nuevos llegan vía push notifications → invalidación de queries.
  // Ya no hay suscripción Realtime (WebSocket roto con Hermes/Expo Cloud).

  // Paso 2: marcar como leída la sala cuando se abre o cambian los mensajes
  useEffect(() => {
    if (!roomId || !user?.id) return;
    markReadUseCase
      .execute(roomId, user.id)
      .then(() => {
        // Update rooms cache to reflect zero unread for this room
        queryClient.setQueryData(["rooms"], (old: Room[] = []) =>
          old.map((r) => (r.id === roomId ? { ...r, unreadCount: 0 } : r)),
        );
      })
      .catch(() => {});
  }, [roomId, user?.id, messages.length]);

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
          await import("@shared/infrastructure/storage/appwriteStorageService");
        const uploadedUrl = await uploadImage(imageUri);
        imageUrl = uploadedUrl ?? undefined;
      }

      return sendMessageUseCase.execute(roomId!, user!.id, content, imageUrl);
    },

    // onMutate se ejecuta ANTES de la petición (optimistic update)
    onMutate: async ({ content, imageUri }) => {
      const tempMsg: Message = {
        id: `temp-${Date.now()}`,
        roomId: roomId!,
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

    onSuccess: (realMsg, variables, context) => {
      queryClient.setQueryData(["messages", roomId], (old: Message[] = []) =>
        old.map((m) => (m.id === context?.tempMsg.id ? realMsg : m)),
      );

      // Push notifications are now handled by AppWrite Cloud Function
      // No need to trigger manually
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
