"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Check } from "lucide-react";
import { Brand } from "./brand";
import { Booking, dateLabel, money } from "@/lib/domain";
export function BookingDetail() {
  const home = "/";
  const params = useSearchParams(),
    id = params.get("id"),
    token = params.get("token");
  const [booking, setBooking] = useState<Booking | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(false);
  useEffect(() => {
    async function load() {
      try {
        const r = await fetch(
          `/api/booking?id=${encodeURIComponent(id ?? "")}&token=${encodeURIComponent(token ?? "")}`,
        );
        const b = await r.json();
        if (!r.ok) throw new Error(b.error);
        setBooking(b);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "No se pudo cargar el turno.",
        );
      }
    }
    void load();
  }, [id, token]);
  async function cancel() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", id, token }),
      });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error);
      setBooking((b) => (b ? { ...b, status: "cancelled" } : null));
      setConfirm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cancelar.");
    } finally {
      setBusy(false);
    }
  }
  function calendar() {
    if (!booking) return;
    const b = booking;
    const start = new Date(`${b.date}T${b.time.slice(0, 5)}:00-03:00`);
    const end = new Date(start.getTime() + b.duration * 60000);
    const stamp = (d: Date) =>
      d
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "");
    const escape = (s: string) =>
      s
        .replace(/\\/g, "\\\\")
        .replace(/[\r\n]+/g, "\\n")
        .replace(/,/g, "\\,")
        .replace(/;/g, "\\;");
    const ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Eddu Barber//Turnos//ES\r\nBEGIN:VEVENT\r\nUID:${b.id}@eddubarber\r\nDTSTAMP:${stamp(new Date())}\r\nDTSTART:${stamp(start)}\r\nDTEND:${stamp(end)}\r\nSUMMARY:${escape(b.service_name)} - Eddu Barber\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;
    const url = URL.createObjectURL(
      new Blob([ics], { type: "text/calendar;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "mi-turno.ics";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <main className="turno-page">
      <Brand href={home} />
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      {booking ? (
        <section className="confirmation panel">
          <span className="confirmation-check">
            <Check size={30} />
          </span>
          <span className="eyebrow">TU PRÓXIMO BUEN CORTE</span>
          <h2>
            {booking.status === "cancelled"
              ? "Tu turno fue cancelado."
              : booking.status === "completed"
                ? "Gracias por venir."
                : booking.status === "no_show"
                  ? "Turno no asistido."
                  : "Tu lugar está reservado."}
          </h2>
          <p>{booking.name}</p>
          <div className="ticket">
            <strong>{booking.service_name}</strong>
            <span>
              {dateLabel(booking.date, true)} · {booking.time.slice(0, 5)} h
            </span>
            <span>
              {booking.duration} min · {money(booking.price)}
            </span>
          </div>
          {booking.status === "confirmed" && (
            <>
              <button className="secondary" onClick={calendar}>
                <CalendarDays size={18} />
                Agregar al calendario
              </button>
              {new Date(
                `${booking.date}T${booking.time.slice(0, 5)}:00-03:00`,
              ) > new Date() &&
                (confirm ? (
                  <div>
                    <p>¿Querés cancelar el turno? El horario quedará libre.</p>
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() => void cancel()}
                    >
                      {busy ? "Cancelando…" : "Sí, cancelar turno"}
                    </button>
                    <button
                      className="text-button"
                      onClick={() => setConfirm(false)}
                    >
                      Conservar turno
                    </button>
                  </div>
                ) : (
                  <button
                    className="text-button cancel-action"
                    onClick={() => setConfirm(true)}
                  >
                    Cancelar mi turno
                  </button>
                ))}
            </>
          )}
          <Link className="text-button" href={home}>
            Reservar otro turno
          </Link>
          <small className="muted">
            No compartas este enlace: permite gestionar tu reserva.
          </small>
        </section>
      ) : !error ? (
        <div className="loading">Cargando tu turno…</div>
      ) : (
        <Link href={home} className="primary">
          Volver a reservas
        </Link>
      )}
    </main>
  );
}
