import "server-only";

import { createSupabaseAdminClient } from "../supabase-admin";

const resultAuditActions = [
  "admin.result.mark_under_review",
  "admin.result.correct",
  "admin.event.void",
  "admin.event.restore"
];

type AuditLogRow = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_table: string;
  entity_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

export type ResultAuditLog = {
  id: string;
  actorId?: string;
  action: string;
  entityTable: string;
  entityId?: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export async function getAdminResultAuditLogs(limit = 100): Promise<ResultAuditLog[]> {
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("audit_logs")
      .select("id, actor_id, action, entity_table, entity_id, payload, created_at")
      .in("action", resultAuditActions)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);

    return ((data ?? []) as AuditLogRow[]).map((row) => ({
      id: row.id,
      actorId: row.actor_id ?? undefined,
      action: row.action,
      entityTable: row.entity_table,
      entityId: row.entity_id ?? undefined,
      payload: row.payload ?? {},
      createdAt: row.created_at
    }));
  } catch {
    return [];
  }
}
