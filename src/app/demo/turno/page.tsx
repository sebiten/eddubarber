import { Suspense } from "react";
import { BookingDetail } from "@/components/booking-detail";
export default function Page() {
  return (
    <Suspense fallback={<main className="loading">Buscando tu turno…</main>}>
      <BookingDetail demo />
    </Suspense>
  );
}
