import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export type Announcement = {
  id: string;
  eventId: string | null;
  title: string;
  body: string;
  createdAt: string;
};

type AnnouncementRow = {
  id: string;
  event_id: string | null;
  title: string;
  body: string;
  created_at: string;
};

// Devuelve [] si la tabla aun no existe (migracion 025 sin aplicar).
export async function getAnnouncements(): Promise<Announcement[]> {
  try {
    const { data, error } = await createSupabaseAdminClient()
      .from("announcements")
      .select("id, event_id, title, body, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return [];

    return ((data ?? []) as AnnouncementRow[]).map((row) => ({
      id: row.id,
      eventId: row.event_id,
      title: row.title,
      body: row.body,
      createdAt: row.created_at
    }));
  } catch {
    return [];
  }
}
