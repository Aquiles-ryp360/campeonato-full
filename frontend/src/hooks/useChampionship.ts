'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import type {
  ApiResponse,
  Campeonato,
  CreateCampeonatoForm,
  PaginatedResponse,
  StandingsEntry,
  UpdateCampeonatoForm,
} from '@/types';

interface ChampionshipFilters {
  page?: number;
  limit?: number;
  search?: string;
  tipo?: string;
  temporadaId?: string;
  categoriaId?: string;
  activo?: boolean;
}

interface ChampionshipStats {
  totalEquipos: number;
  totalJugadores: number;
  totalPartidos: number;
  partidosPendientes: number;
  partidosJugados: number;
}

export function useChampionships(filters: ChampionshipFilters = {}) {
  return useQuery({
    queryKey: ['championships', filters],
    queryFn: () =>
      api.get<ApiResponse<PaginatedResponse<Campeonato>>>(
        '/campeonatos',
        filters,
      ),
  });
}

export function useChampionship(id: string) {
  return useQuery({
    queryKey: ['championship', id],
    queryFn: () =>
      api.get<ApiResponse<Campeonato>>(`/campeonatos/${id}`),
    enabled: !!id,
  });
}

export function useCreateChampionship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCampeonatoForm) =>
      api.post<ApiResponse<Campeonato>>('/campeonatos', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['championships'] });
    },
  });
}

export function useUpdateChampionship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCampeonatoForm }) =>
      api.patch<ApiResponse<Campeonato>>(`/campeonatos/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['championships'] });
      queryClient.invalidateQueries({
        queryKey: ['championship', variables.id],
      });
    },
  });
}

export function useDeleteChampionship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.del<ApiResponse<void>>(`/campeonatos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['championships'] });
    },
  });
}

export function useChampionshipStandings(id: string) {
  return useQuery({
    queryKey: ['championship', id, 'standings'],
    queryFn: () =>
      api.get<ApiResponse<StandingsEntry[]>>(
        `/campeonatos/${id}/tabla`,
      ),
    enabled: !!id,
  });
}

export function useChampionshipStats(id: string) {
  return useQuery({
    queryKey: ['championship', id, 'stats'],
    queryFn: () =>
      api.get<ApiResponse<ChampionshipStats>>(
        `/campeonatos/${id}/stats`,
      ),
    enabled: !!id,
  });
}
