import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./brand-theme.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Eddu Barber · Reservas",
    template: "%s · Eddu Barber",
  },
  description:
    "Reservá tu turno en Eddu Barber Studio. Elegí tu servicio, día y horario.",
  applicationName: "Eddu Barber",
  authors: [{ name: "Eddu Barber Studio" }],
  creator: "Eddu Barber Studio",
  keywords: ["barbería", "barber shop", "turnos", "Eddu Barber"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: "/",
    siteName: "Eddu Barber Studio",
    title: "Eddu Barber Studio · Reservá tu turno",
    description:
      "Elegí tu servicio, día y horario en Eddu Barber Studio.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Eddu Barber Studio" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Eddu Barber Studio · Reservá tu turno",
    description:
      "Elegí tu servicio, día y horario en Eddu Barber Studio.",
    images: ["/twitter-image"],
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#191b1d",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
