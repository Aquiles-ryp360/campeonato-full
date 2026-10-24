import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Inscripciones abiertas - Campeonato de Futsal y Vóley";
export const size = {
  width: 1200,
  height: 630
};
export const contentType = "image/png";

const phones = ["988 765 715", "921 580 174", "984 000 201", "923 037 653"];

export default async function OpenGraphImage() {
  const fontDir = join(process.cwd(), "assets/fonts");
  const [black, blackItalic, bold] = await Promise.all([
    readFile(join(fontDir, "Lato-Black.ttf")),
    readFile(join(fontDir, "Lato-BlackItalic.ttf")),
    readFile(join(fontDir, "Lato-Bold.ttf"))
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #171B4F 0%, #252A73 55%, #444A94 100%)",
          color: "#FFFFFF",
          display: "flex",
          flexDirection: "column",
          fontFamily: "Lato",
          height: "100%",
          justifyContent: "center",
          padding: "64px 72px",
          width: "100%"
        }}
      >
        <div
          style={{
            alignSelf: "flex-start",
            background: "rgba(255,255,255,0.12)",
            borderRadius: 999,
            color: "#F0E834",
            display: "flex",
            fontSize: 28,
            fontWeight: 900,
            padding: "10px 26px"
          }}
        >
          Inscripciones abiertas
        </div>
        <div style={{ display: "flex", fontSize: 92, fontStyle: "italic", fontWeight: 900, lineHeight: 1, marginTop: 30 }}>
          INSCRIBE A TU&nbsp;<span style={{ color: "#F0E834" }}>EQUIPO</span>
        </div>
        <div style={{ display: "flex", fontSize: 40, fontWeight: 900, marginTop: 22 }}>
          Campeonato de Futsal y Vóley · UNA Puno
        </div>
        <div style={{ color: "rgba(255,255,255,0.75)", display: "flex", fontSize: 26, fontWeight: 700, marginTop: 40 }}>
          Informes e inscripciones por WhatsApp
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 14 }}>
          {phones.map((phone) => (
            <div
              key={phone}
              style={{
                background: "#FFFFFF",
                borderRadius: 999,
                color: "#171B4F",
                display: "flex",
                fontSize: 30,
                fontWeight: 900,
                padding: "10px 22px"
              }}
            >
              {phone}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Lato", data: black, weight: 900, style: "normal" },
        { name: "Lato", data: blackItalic, weight: 900, style: "italic" },
        { name: "Lato", data: bold, weight: 700, style: "normal" }
      ]
    }
  );
}
