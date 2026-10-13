-- Control de clasificacion por grupos.
-- Permite campeonatos donde solo clasifican los N primeros de cada grupo
-- (sin arrastrar "mejores terceros") aunque la llave no sea potencia de dos.
-- Cuando es false, los clasificados directos arman la llave con ronda preliminar.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS qualify_best_thirds boolean NOT NULL DEFAULT true;
