'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import type {
  ApiResponse,
  CreatePartidoForm,
  PaginatedResponse,
  Partido,
  UpdatePartidoForm,
  UpdateResultForm,
} from '@/types';

interface MatchFilters {
  page?: number;
  limit?: number;
  fixtureId?: string;
  equipoId?: string;
  estado?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  campeonatoId?: string;
}

export function useMatches(filters: MatchFilters = {}) {
  return useQuery({
    queryKey: ['matches', filters],
    queryFn: () =>
      api.get<ApiResponse<PaginatedResponse<Partido>>>(
        '/partidos',
        filters,
      ),
  });
}

export function useMatch(id: string) {
  return useQuery({
    queryKey: ['match', id],
    queryFn: () => api.get<ApiResponse<Partido>>(`/partidos/${id}`),
    enabled: !!id,
  });
}

export function useCreateMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePartidoForm) =>
      api.post<ApiResponse<Partido>>('/partidos', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}

export function useUpdateMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePartidoForm }) =>
      api.patch<ApiResponse<Partido>>(`/partidos/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['match', variables.id] });
    },
  });
}

export function useUpdateResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateResultForm }) =>
      api.patch<ApiResponse<Partido>>(`/partidos/${id}/resultado`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['match', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['championship'] });
    },
  });
}
