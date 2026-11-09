import type { Metadata } from "next";
import "./globals.css";
import "./brand-theme.css";
export const metadata: Metadata = {
  title: "Eddu Barber · Tu próximo buen corte",
  description:
    "Reservá tu turno en Eddu Barber. Elegí tu servicio, día y horario.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
