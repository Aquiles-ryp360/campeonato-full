import { Download } from "lucide-react";
import { Button } from "@/components/ui";

export function OfficialPdfButton({
  href,
  fileName
}: {
  href?: string;
  fileName?: string;
}) {
  if (!href) {
    return (
      <Button variant="secondary" disabled>
        <Download className="h-4 w-4" />
        PDF no disponible
      </Button>
    );
  }

  return (
    <Button href={href} variant="highlight" download={fileName ?? true}>
      <Download className="h-4 w-4" />
      Descargar bases PDF
    </Button>
  );
}
