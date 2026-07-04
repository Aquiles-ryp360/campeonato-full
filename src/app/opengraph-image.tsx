import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 630
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#F8FAFF",
          color: "#11142D",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "center",
          padding: 72,
          width: "100%"
        }}
      >
        <div style={{ color: "#2F46FF", fontSize: 28, fontWeight: 900 }}>Campeonato UNA Puno</div>
        <div style={{ fontSize: 72, fontWeight: 900, lineHeight: 1.05, marginTop: 24 }}>
          Fixture, arbitraje en vivo y resultados oficiales
        </div>
        <div style={{ color: "#5F6475", fontSize: 30, fontWeight: 700, marginTop: 28 }}>
          Plataforma de gestion deportiva por carrera
        </div>
      </div>
    ),
    size
  );
}
