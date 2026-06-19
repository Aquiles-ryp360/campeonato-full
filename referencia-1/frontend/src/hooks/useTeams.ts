'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import type {
  ApiResponse,
  CreateEquipoForm,
  Equipo,
  UpdateEquipoForm,
} from '@/types';

export function useTeams(campeonatoId?: string) {
  return useQuery({
    queryKey: ['teams', campeonatoId],
    queryFn: () =>
      api.get<ApiResponse<Equipo[]>>('/equipos', {
        ...(campeonatoId && { campeonatoId }),
      }),
    enabled: true,
  });
}

export function useTeam(id: string) {
  return useQuery({
    queryKey: ['team', id],
    queryFn: () => api.get<ApiResponse<Equipo>>(`/equipos/${id}`),
    enabled: !!id,
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEquipoForm) =>
      api.post<ApiResponse<Equipo>>('/equipos', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEquipoForm }) =>
      api.patch<ApiResponse<Equipo>>(`/equipos/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['team', variables.id] });
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.del<ApiResponse<void>>(`/equipos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}
