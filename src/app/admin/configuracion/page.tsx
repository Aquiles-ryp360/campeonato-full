import { BasesUploadForm } from "@/features/admin/components/BasesUploadForm";
import { Button, Card, SectionHeader } from "@/components/ui";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <Card className="p-5">
        <SectionHeader
          title="Configuracion deportiva"
          description="Los formatos, reglas, canchas y horarios se editan desde cada campeonato para evitar datos repetidos."
          action={<Button href="/admin/campeonatos/nuevo">Crear campeonato</Button>}
        />
      </Card>
      <BasesUploadForm />
    </div>
  );
}
