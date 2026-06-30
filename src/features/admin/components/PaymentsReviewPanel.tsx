"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, SectionHeader } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

type PaymentRow = {
  id: string;
  amount: number | string;
  method: string;
  operation_code: string | null;
  receipt_url: string | null;
  status: "pending" | "review" | "approved" | "rejected";
  created_at: string;
  teams?: {
    name: string;
    delegate_name: string;
    delegate_email: string | null;
    status: string;
    payment_status: string;
  } | null;
  events?: {
    name: string;
    category: string;
  } | null;
};

export function PaymentsReviewPanel() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    void loadPayments();
  }, []);

  async function loadPayments() {
    const response = await fetch("/api/admin/payments");
    const payload = (await response.json().catch(() => null)) as { ok: true; payments: PaymentRow[] } | null;
    setPayments(payload?.ok ? payload.payments : []);
  }

  async function approve(id: string) {
    await act(id, `/api/admin/payments/${id}/approve`, {});
  }

  async function reject(id: string) {
    const reason = window.prompt("Motivo del rechazo");
    if (!reason) return;
    await act(id, `/api/admin/payments/${id}/reject`, { reason });
  }

  async function act(id: string, url: string, body: unknown) {
    setBusyId(id);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !payload?.ok) {
        toast.error(payload?.error ?? "No se pudo actualizar el pago.");
        return;
      }
      toast.success("Pago actualizado.");
      await loadPayments();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-ink/10 p-5">
        <SectionHeader
          title="Validacion de pagos"
          description="Revisa operaciones, comprobantes y estado de aprobacion antes de aprobar equipos."
          action={<Badge tone="blue">{payments.length} pagos</Badge>}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-mist text-left text-xs uppercase text-ink/55">
            <tr>
              <th className="px-5 py-3">Equipo</th>
              <th className="px-3 py-3">Campeonato</th>
              <th className="px-3 py-3">Pago</th>
              <th className="px-3 py-3">Operacion</th>
              <th className="px-3 py-3">Estado</th>
              <th className="px-5 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/8">
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td className="px-5 py-4">
                  <p className="font-bold text-ink">{payment.teams?.name ?? "Equipo"}</p>
                  <p className="text-xs text-ink/60">{payment.teams?.delegate_name}</p>
                  <p className="text-xs text-ink/60">{payment.teams?.delegate_email}</p>
                </td>
                <td className="px-3 py-4">
                  <p className="font-semibold text-ink">{payment.events?.name ?? "Campeonato"}</p>
                  <p className="text-xs text-ink/60">{payment.events?.category}</p>
                </td>
                <td className="px-3 py-4">
                  <p className="font-bold text-ink">{formatMoney(Number(payment.amount))}</p>
                  <p className="text-xs uppercase text-ink/60">{payment.method}</p>
                </td>
                <td className="px-3 py-4">
                  <p className="font-semibold text-ink">{payment.operation_code ?? "Sin codigo"}</p>
                  {payment.receipt_url ? (
                    <a className="text-xs font-semibold text-field underline" href={payment.receipt_url} target="_blank">
                      Ver comprobante
                    </a>
                  ) : (
                    <p className="text-xs text-ink/55">Sin comprobante</p>
                  )}
                </td>
                <td className="px-3 py-4">
                  <Badge tone={payment.status === "approved" ? "green" : payment.status === "rejected" ? "red" : "amber"}>
                    {payment.status}
                  </Badge>
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" disabled={busyId !== null || payment.status === "approved"} onClick={() => void approve(payment.id)}>
                      {busyId === payment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Aprobar
                    </Button>
                    <Button variant="secondary" disabled={busyId !== null || payment.status === "rejected"} onClick={() => void reject(payment.id)}>
                      <XCircle className="h-4 w-4" />
                      Rechazar
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-sm text-ink/55">
                  Todavia no hay pagos registrados.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
