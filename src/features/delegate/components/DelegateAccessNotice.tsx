import { Clock3, LockKeyhole, MailCheck } from "lucide-react";
import { Button, Card, SectionHeader } from "@/components/ui";

export type DelegateAccessNoticeReason = "not_authenticated" | "not_registered" | "pending_review" | "not_delegate";

export function DelegateAccessNotice({
  reason,
  email
}: {
  reason: DelegateAccessNoticeReason;
  email?: string | null;
}) {
  const isPending = reason === "pending_review";
  const Icon = isPending ? Clock3 : reason === "not_registered" ? MailCheck : LockKeyhole;

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-amber-100 text-amber-900">
            <Icon className="h-5 w-5" />
          </div>
          <SectionHeader
            eyebrow="Panel delegado"
            title={noticeTitle(reason)}
            description={noticeDescription(reason, email)}
          />
        </div>
        <Button href="/login?next=%2Fdelegado" variant={isPending ? "secondary" : "primary"}>
          {isPending ? "Cambiar correo" : "Ir a login"}
        </Button>
      </div>
    </Card>
  );
}

function noticeTitle(reason: DelegateAccessNoticeReason) {
  if (reason === "pending_review") return "Inscripcion en revision";
  if (reason === "not_registered") return "Correo no registrado";
  if (reason === "not_delegate") return "Acceso no habilitado";
  return "Acceso restringido";
}

function noticeDescription(reason: DelegateAccessNoticeReason, email?: string | null) {
  const emailText = email ? ` (${email})` : "";

  if (reason === "pending_review") {
    return `Tu equipo${emailText} todavia esta en revision. El panel se habilitara cuando administracion apruebe la inscripcion.`;
  }

  if (reason === "not_registered") {
    return `El correo autenticado${emailText} no coincide con ningun delegado inscrito. Usa el mismo correo registrado durante la inscripcion.`;
  }

  if (reason === "not_delegate") {
    return "Tu cuenta existe, pero no tiene un equipo aprobado vinculado como delegado.";
  }

  return "Inicia sesion con el correo registrado durante la inscripcion del equipo.";
}
