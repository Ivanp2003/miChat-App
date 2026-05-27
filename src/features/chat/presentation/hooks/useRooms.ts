import { useAuthStore } from "@features/auth/presentation/store/authStore";
import { CreateRoomUseCase } from "@features/chat/application/use-cases/CreateRoomUseCase";
import { Room } from "@features/chat/domain/entities/Message";
import { SupabaseChatRepository } from "@features/chat/infrastructure/repositories/SupabaseChatRepository";
import { supabase } from "@shared/infrastructure/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

const chatRepo = new SupabaseChatRepository();
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

    const channel = supabase
      .channel("room_participants_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_participants",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // El usuario fue agregado a una sala, refrescar la lista
          queryClient.invalidateQueries({ queryKey: ["rooms"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
