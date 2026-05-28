import { useAuthStore } from "@features/auth/presentation/store/authStore";
import { CreateRoomUseCase } from "@features/chat/application/use-cases/CreateRoomUseCase";
import { Room } from "@features/chat/domain/entities/Message";
import { AppWriteChatRepository } from "@features/chat/infrastructure/repositories/AppWriteChatRepository";
import {
    APPWRITE_CONFIG,
    realtime,
} from "@shared/infrastructure/appwrite/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

const chatRepo = new AppWriteChatRepository();
const createRoomUseCase = new CreateRoomUseCase(chatRepo);

export function useRooms() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  // useQuery obtiene la lista de salas y la cachea bajo la clave ['rooms']
  const {
    data: rooms = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => chatRepo.getRooms(user!.id),
    enabled: !!user, // Solo fetchar si hay usuario autenticado
  });

  // Suscripción en tiempo real para cuando el usuario es agregado a una sala
  useEffect(() => {
    if (!user) return;

    const channel = `databases.${APPWRITE_CONFIG.DATABASE_ID}.collections.${APPWRITE_CONFIG.COLLECTIONS.ROOM_PARTICIPANTS}.documents`;

    let subscription: any = null;

    realtime
      .subscribe(channel, (response) => {
        // Validamos que el evento sea de creación de un documento
        if (response.events.some((e) => e.includes(".create"))) {
          const payload = response.payload as any;

          // FILTRADO EN CLIENTE: Comprobamos si pertenece al usuario actual
          if (payload.user_id === user.id) {
            // El usuario fue agregado a una sala, refrescar la lista
            queryClient.invalidateQueries({ queryKey: ["rooms"] });
          }
        }
      })
      .then((sub) => {
        subscription = sub;
      });

    return () => {
      if (subscription) {
        subscription.close();
      }
    };
  }, [user, queryClient]);

  // useQuery para obtener usuarios disponibles
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["users"],
    queryFn: () => chatRepo.getUsers(user!.id),
    enabled: !!user,
  });

  // useMutation para crear una sala nueva
  const createMutation = useMutation({
    mutationFn: ({
      name,
      participantIds,
    }: {
      name: string;
      participantIds: string[];
    }) => createRoomUseCase.execute(name, user!.id, participantIds),
    onSuccess: (newRoom) => {
      // Actualizar el cache
      queryClient.setQueryData(["rooms"], (old: Room[]) => [
        newRoom,
        ...(old ?? []),
      ]);
    },
  });

  return {
    rooms,
    isLoading,
    error: error?.message ?? null,
    users,
    isLoadingUsers,
    createRoom: createMutation.mutate,
    isCreating: createMutation.isPending,
    createError: createMutation.error?.message ?? null,
  };
}
