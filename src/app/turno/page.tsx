import { Suspense } from "react";
import { BookingDetail } from "@/components/booking-detail";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Mi turno · Eddu Barber",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function Page() {
  return (
    <Suspense fallback={<main className="loading">Buscando tu turno…</main>}>
      <BookingDetail />
    </Suspense>
  );
}
