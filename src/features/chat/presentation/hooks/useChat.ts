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
    // Polling como fallback cuando las push no llegan (dev / Expo Go)
    staleTime: Infinity,
    refetchInterval: 30_000,
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
        const { APPWRITE_CONFIG } = await import(
          "@shared/infrastructure/appwrite/client"
        );
        const uploadedUrl = await uploadImage(
          APPWRITE_CONFIG.STORAGE_BUCKET_ID,
          imageUri,
        );
        console.log("Upload result:", uploadedUrl);
        imageUrl = uploadedUrl ?? undefined;
        console.log("Final imageUrl to save:", imageUrl);
      }

      return sendMessageUseCase.execute(roomId!, user!.id, content, imageUrl);
    },

    onMutate: async ({ content, imageUri }) => {
      await queryClient.cancelQueries({ queryKey: ["messages", roomId] });

      const prev = queryClient.getQueryData<Message[]>(["messages", roomId]);

      const tempMsg: Message = {
        id: `temp-${Date.now()}`,
        roomId: roomId!,
        userId: user!.id,
        content,
        imageUrl: imageUri,
        createdAt: new Date(),
        authorUsername: user!.username,
      };
      queryClient.setQueryData<Message[]>(["messages", roomId], (old = []) => [
        ...old,
        tempMsg,
      ]);

      return { prev };
    },

    onError: (_err, _variables, context) => {
      if (context?.prev) {
        queryClient.setQueryData(["messages", roomId], context.prev);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", roomId] });
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
