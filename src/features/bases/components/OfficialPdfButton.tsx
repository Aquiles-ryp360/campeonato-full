import { Download } from "lucide-react";
import { Button } from "@/components/ui";

export function OfficialPdfButton({ href }: { href?: string }) {
  return (
    <Button href={href ?? "#"} variant="secondary">
      <Download className="h-4 w-4" />
      PDF oficial
    </Button>
  );
}
