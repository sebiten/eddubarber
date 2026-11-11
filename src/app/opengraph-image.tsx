import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 84px",
        background: "#191b1d",
        color: "#ffffff",
        fontFamily: "Arial",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <div
          style={{
            width: 112,
            height: 112,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 28,
            border: "4px solid #ffffff",
            fontSize: 68,
            fontWeight: 700,
          }}
        >
          ×
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 28, letterSpacing: 6, color: "#d8d8d8" }}>
            EDDU
          </span>
          <span style={{ fontSize: 24, letterSpacing: 4, color: "#b43b3d" }}>
            BARBER STUDIO
          </span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <span style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.05 }}>
          Tu próximo corte,
        </span>
        <span style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.05, color: "#d9a441" }}>
          sin vueltas.
        </span>
        <span style={{ fontSize: 30, color: "#c8c8c8" }}>
          Reservá tu turno online en Eddu Barber Studio.
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <span style={{ fontSize: 25, color: "#a9a9a9" }}>eddu barber studio</span>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ width: 72, height: 8, background: "#b43b3d" }} />
          <div style={{ width: 72, height: 8, background: "#315d7e" }} />
        </div>
      </div>
    </div>,
    size,
  );
}
