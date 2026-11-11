import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Eddu Barber Studio",
    short_name: "Eddu Barber",
    description: "Reservá tu turno en Eddu Barber Studio.",
    start_url: "/",
    display: "standalone",
    background_color: "#191b1d",
    theme_color: "#191b1d",
    lang: "es-AR",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
    ],
  };
}
