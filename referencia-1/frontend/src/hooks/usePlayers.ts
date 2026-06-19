'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import type {
  ApiResponse,
  CreateJugadorForm,
  Jugador,
  UpdateJugadorForm,
} from '@/types';

export function usePlayers(equipoId?: string) {
  return useQuery({
    queryKey: ['players', equipoId],
    queryFn: () =>
      api.get<ApiResponse<Jugador[]>>('/jugadores', {
        ...(equipoId && { equipoId }),
      }),
    enabled: true,
  });
}

export function usePlayer(id: string) {
  return useQuery({
    queryKey: ['player', id],
    queryFn: () => api.get<ApiResponse<Jugador>>(`/jugadores/${id}`),
    enabled: !!id,
  });
}

export function useCreatePlayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateJugadorForm) =>
      api.post<ApiResponse<Jugador>>('/jugadores', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
    },
  });
}

export function useUpdatePlayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateJugadorForm }) =>
      api.patch<ApiResponse<Jugador>>(`/jugadores/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['player', variables.id] });
    },
  });
}

export function useDeletePlayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.del<ApiResponse<void>>(`/jugadores/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
    },
  });
}
