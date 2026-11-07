"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  LockKeyhole,
  LogOut,
  MapPin,
  MessageCircle,
  Plus,
  Scissors,
  Settings2,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  addDays,
  Booking,
  Data,
  dateLabel,
  demoData,
  money,
  Service,
  slots,
  today,
} from "@/lib/domain";
import { browserDb, configured } from "@/lib/supabase";

const storageKey = "eddu-barber-demo-v1";
type Tab = "agenda" | "blocks" | "services" | "settings";
type Command = { action: string; [key: string]: unknown };
const statusLabels = {
  confirmed: "Confirmado",
  completed: "Completado",
  cancelled: "Cancelado",
  no_show: "No asistió",
};

export function BarberApp({ admin }: { admin: boolean }) {
  const [data, setData] = useState<Data>(demoData);
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("agenda");
  const [date, setDate] = useState(today);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const refresh = useCallback(
    async (token?: string | null) => {
      if (!configured) {
        try {
          const saved = localStorage.getItem(storageKey);
          setData(saved ? JSON.parse(saved) : demoData());
        } catch {
          setData(demoData());
        }
        setReady(true);
        return;
      }
      try {
        const response = await fetch(`/api/data${admin ? "?admin=1" : ""}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
        });
        if (!response.ok) {
          setError(
            response.status === 401
              ? "Ingresá con la cuenta del barbero autorizada para este panel."
              : "No se pudo cargar la agenda. Volvé a intentar.",
          );
          setReady(true);
          return;
        }
        setData(await response.json());
        setReady(true);
      } catch {
        setError("No hay conexión. Intentá nuevamente en unos segundos.");
        setReady(true);
      }
    },
    [admin],
  );

  useEffect(() => {
    if (!configured) {
      void refresh();
      const handler = () => void refresh();
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    }
    const db = browserDb();
    void db.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s?.access_token ?? null);
      void refresh(s?.access_token);
    });
    const { data: subscription } = db.auth.onAuthStateChange((_event, s) => {
      setSession(s?.access_token ?? null);
      void refresh(s?.access_token);
    });
    return () => subscription.subscription.unsubscribe();
  }, [refresh]);
  useEffect(() => {
    if (!configured) return;
    const id = setInterval(() => void refresh(session), 20000);
    return () => clearInterval(id);
  }, [refresh, session]);

  async function command(payload: Command): Promise<Booking | undefined> {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (configured) {
        const response = await fetch("/api/manage", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session ? { Authorization: `Bearer ${session}` } : {}),
          },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "No se pudo guardar.");
        await refresh(session);
        return result.booking;
      }
      const saved = localStorage.getItem(storageKey);
      const next: Data = saved ? JSON.parse(saved) : demoData();
      let created: Booking | undefined;
      if (payload.action === "book") {
        const service = next.services.find(
          (s) => s.id === payload.service_id && s.active,
        );
        if (
          String(payload.date) > addDays(today(), 60) ||
          !service ||
          !slots(next, String(payload.date), service.duration).includes(
            String(payload.time),
          )
        )
          throw new Error("Ese horario ya no está disponible. Elegí otro.");
        created = {
          id: crypto.randomUUID(),
          token: crypto.randomUUID(),
          date: String(payload.date),
          time: String(payload.time),
          duration: service.duration,
          service_id: service.id,
          service_name: service.name,
          price: service.price,
          name: String(payload.name),
          phone: String(payload.phone),
          status: "confirmed",
        };
        next.bookings.push(created);
      } else if (payload.action === "status") {
        const booking = next.bookings.find((b) => b.id === payload.id);
        if (
          booking?.status === "cancelled" &&
          payload.status !== "cancelled" &&
          !slots(next, booking.date, booking.duration).includes(booking.time)
        )
          throw new Error(
            "No se puede restaurar: el horario está ocupado, bloqueado o ya pasó.",
          );
        next.bookings = next.bookings.map((b) =>
          b.id === payload.id
            ? { ...b, status: payload.status as Booking["status"] }
            : b,
        );
      } else if (payload.action === "block") {
        next.blocks = next.blocks.filter((b) => b.date !== payload.date);
        next.blocks.push({
          date: String(payload.date),
          reason: String(payload.reason),
        });
        if (payload.cancel)
          next.bookings = next.bookings.map((b) =>
            b.date === payload.date && b.status === "confirmed"
              ? { ...b, status: "cancelled" }
              : b,
          );
      } else if (payload.action === "unblock") {
        next.blocks = next.blocks.filter((b) => b.date !== payload.date);
      } else if (payload.action === "service") {
        const service = payload.service as Service;
        next.services = [
          ...next.services.filter((s) => s.id !== service.id),
          service,
        ];
      } else if (payload.action === "settings") {
        next.settings = payload.settings as Data["settings"];
      }
      setData(next);
      localStorage.setItem(storageKey, JSON.stringify(next));
      return created;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
      throw e;
    } finally {
      setBusy(false);
    }
  }

  async function run(payload: Command, message: string) {
    try {
      await command(payload);
      setNotice(message);
    } catch {
      /* Visible error above. */
    }
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setNotice("Link de reservas copiado.");
    } catch {
      setError(
        "No se pudo copiar. Podés compartir la dirección de la página de reservas.",
      );
    }
  }
  const selected = data.bookings.filter((b) => b.date === date);
  const active = selected.filter(
    (b) => b.status !== "cancelled" && b.status !== "no_show",
  );
  const shown = selected
    .filter(
      (b) =>
        (filter === "all" || b.status === filter) &&
        `${b.name} ${b.phone}`.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => a.time.localeCompare(b.time));
  const blocked = data.blocks.find((b) => b.date === date);

  if (ready && admin && configured && !session)
    return <Login onError={setError} error={error} />;
  return (
    <div className={admin ? "app-shell" : "public-shell"}>
      {admin && (
        <aside className="sidebar">
          <Brand />
          <div className="workspace-label">TU BARBERÍA</div>
          <nav>
            {(
              [
                ["agenda", "Agenda", CalendarDays],
                ["blocks", "Días bloqueados", LockKeyhole],
                ["services", "Servicios", Scissors],
                ["settings", "Configuración", Settings2],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={tab === id ? "nav-item active" : "nav-item"}
              >
                <Icon size={19} />
                <span>{label}</span>
                {id === "agenda" && <span className="nav-dot" />}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="share-card">
              <span className="tiny-label">TU AGENDA, SIEMPRE ABIERTA</span>
              <p>
                Vos cortás.
                <br />
                Tu link toma los turnos.
              </p>
              <button onClick={copyLink}>
                Copiar mi link <Copy size={15} />
              </button>
            </div>
            <div className="profile">
              <span className="avatar dark">EB</span>
              <div>
                <strong>Eddu Barber</strong>
                <small>Mi espacio de trabajo</small>
              </div>
              {configured && (
                <button
                  className="icon-button"
                  aria-label="Cerrar sesión"
                  onClick={() => void browserDb().auth.signOut()}
                >
                  <LogOut size={17} />
                </button>
              )}
            </div>
          </div>
        </aside>
      )}
      <div className="main-shell">
        <header className="topbar">
          {admin ? (
            <>
              <span className="breadcrumb">
                Mi barbería <span>/</span>{" "}
                <strong>
                  {
                    {
                      agenda: "Agenda",
                      blocks: "Días bloqueados",
                      services: "Servicios",
                      settings: "Configuración",
                    }[tab]
                  }
                </strong>
              </span>
              <Link className="top-link" href="/" target="_blank">
                Ver página de reservas <ArrowUpRight size={16} />
              </Link>
            </>
          ) : (
            <>
              <Brand />
              <Link className="top-link" href="/panel">
                Soy el barbero <ArrowUpRight size={16} />
              </Link>
            </>
          )}
          {admin && configured && session && (
            <button
              className="icon-button"
              aria-label="Cerrar sesión"
              onClick={() => void browserDb().auth.signOut()}
            >
              <LogOut size={17} />
            </button>
          )}
        </header>
        {!configured && (
          <div className="demo-banner">
            <span className="live-dot" /> Modo demo · Los cambios se guardan
            solo en este navegador.
          </div>
        )}
        <main className={admin ? "content" : "public-content"}>
          {error && (
            <div className="alert error" role="alert">
              {error}
              <button
                className="icon-button"
                aria-label="Cerrar aviso"
                onClick={() => setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div className="alert success" role="status">
              <Check size={18} />
              {notice}
              <button
                className="icon-button"
                aria-label="Cerrar aviso"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {!ready ? (
            <div className="loading">Cargando la agenda…</div>
          ) : !admin ? (
            <>
              <section className="public-hero">
                <div className="eyebrow">
                  <span className="barber-pole" /> ESTILO PROPIO. SIN VUELTAS.
                </div>
                <h1>
                  Un buen corte.
                  <br />
                  <span>Un buen día.</span>
                </h1>
                <p>
                  Tu próximo turno en {data.settings.name}.<br />
                  Elegí cómo, cuándo y listo. Nosotros nos encargamos del resto.
                </p>
                <div className="location">
                  <MapPin size={17} />
                  {data.settings.address}
                </div>
                <div className="hero-stamp">
                  <Scissors size={34} />
                  <span>
                    EDDU
                    <br />
                    BARBER
                  </span>
                  <small>EL DETALLE HACE EL ESTILO</small>
                </div>
              </section>
              <BookingForm data={data} busy={busy} command={command} />
              <footer className="public-footer">
                <Brand />
                <span>Buenos cortes. Buenas costumbres.</span>
              </footer>
            </>
          ) : (
            <>
              <div className="page-heading">
                <div className="eyebrow">
                  {tab === "agenda"
                    ? "TODO LISTO PARA UN BUEN DÍA"
                    : "TU NEGOCIO, A TU MANERA"}
                </div>
                <div className="heading-row">
                  <div>
                    <h1>
                      {
                        {
                          agenda: "Tu agenda.",
                          blocks: "Tu tiempo también importa.",
                          services: "El menú de la casa.",
                          settings: "A tu manera.",
                        }[tab]
                      }
                    </h1>
                    <p>
                      {
                        {
                          agenda:
                            "Menos mensajes, más tiempo para hacer lo tuyo.",
                          blocks: "Tomate el día. Tu página avisa por vos.",
                          services: "Servicios claros. Turnos sin vueltas.",
                          settings:
                            "Los detalles que hacen funcionar tu barbería.",
                        }[tab]
                      }
                    </p>
                  </div>
                  {tab === "agenda" ? (
                    <button
                      className="primary"
                      onClick={() => setBookingOpen(true)}
                    >
                      <Plus size={18} />
                      Nuevo turno
                    </button>
                  ) : tab === "blocks" ? (
                    <button
                      className="primary"
                      onClick={() => setBlockOpen(true)}
                    >
                      <Plus size={18} />
                      Bloquear un día
                    </button>
                  ) : null}
                </div>
              </div>
              {tab === "agenda" && (
                <>
                  <section className="stats-grid">
                    <Stat
                      label="TURNOS DEL DÍA"
                      value={String(active.length).padStart(2, "0")}
                      detail={`${selected.filter((b) => b.status === "confirmed").length} por atender`}
                      icon={<CalendarDays size={20} />}
                    />
                    <Stat
                      label="INGRESOS ESTIMADOS"
                      value={money(active.reduce((sum, b) => sum + b.price, 0))}
                      detail="De los turnos activos"
                      icon={<span className="money-icon">$</span>}
                    />
                    <Stat
                      label="YA ATENDIDOS"
                      value={String(
                        selected.filter((b) => b.status === "completed").length,
                      ).padStart(2, "0")}
                      detail="Un buen corte más"
                      icon={<Check size={20} />}
                    />
                  </section>
                  <div className="agenda-layout">
                    <section className="panel agenda-panel">
                      <div className="section-title">
                        <div>
                          <span className="tiny-label">LA AGENDA</span>
                          <h2>{dateLabel(date, true)}</h2>
                        </div>
                        <div className="date-controls">
                          <button
                            className="icon-button"
                            aria-label="Día anterior"
                            onClick={() => setDate(addDays(date, -1))}
                          >
                            <ChevronLeft size={18} />
                          </button>
                          <button
                            className="small-button"
                            onClick={() => setDate(today())}
                          >
                            Hoy
                          </button>
                          <button
                            className="icon-button"
                            aria-label="Día siguiente"
                            onClick={() => setDate(addDays(date, 1))}
                          >
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      </div>
                      <div className="week-strip">
                        {Array.from({ length: 7 }, (_, i) => {
                          const d = addDays(
                            date,
                            -((new Date(date + "T12:00:00").getDay() + 6) % 7) +
                              i,
                          );
                          return (
                            <button
                              key={d}
                              className={d === date ? "day selected" : "day"}
                              onClick={() => setDate(d)}
                            >
                              <span>
                                {new Intl.DateTimeFormat("es-AR", {
                                  weekday: "short",
                                }).format(new Date(d + "T12:00:00"))}
                              </span>
                              <strong>{Number(d.slice(-2))}</strong>
                              <i
                                className={
                                  data.blocks.some((b) => b.date === d)
                                    ? "blocked-dot"
                                    : data.bookings.some(
                                          (b) =>
                                            b.date === d &&
                                            b.status === "confirmed",
                                        )
                                      ? "booking-dot"
                                      : ""
                                }
                              />
                            </button>
                          );
                        })}
                      </div>
                      {blocked && (
                        <div className="blocked-notice">
                          <LockKeyhole size={18} />
                          <div>
                            <strong>Día bloqueado</strong>
                            <p>{blocked.reason}</p>
                          </div>
                          <button
                            onClick={() =>
                              void run(
                                { action: "unblock", date },
                                "Día habilitado.",
                              )
                            }
                            disabled={busy}
                          >
                            Habilitar
                          </button>
                        </div>
                      )}
                      <div className="agenda-filters">
                        <div className="segmented">
                          <button
                            className={filter === "all" ? "selected" : ""}
                            onClick={() => setFilter("all")}
                          >
                            Todos <span>{selected.length}</span>
                          </button>
                          <button
                            className={filter === "confirmed" ? "selected" : ""}
                            onClick={() => setFilter("confirmed")}
                          >
                            Pendientes
                          </button>
                        </div>
                        <input
                          aria-label="Buscar cliente"
                          placeholder="Buscar cliente…"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </div>
                      <div className="booking-list">
                        {shown.length ? (
                          shown.map((b) => (
                            <article
                              className={`appointment ${b.status}`}
                              key={b.id}
                            >
                              <div className="appointment-time">
                                <strong>{b.time.slice(0, 5)}</strong>
                                <span>{b.duration} min</span>
                              </div>
                              <span className="avatar">
                                {b.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join("")
                                  .toUpperCase()}
                              </span>
                              <div className="appointment-info">
                                <strong>{b.name}</strong>
                                <span>{b.service_name}</span>
                                <a
                                  href={`https://wa.me/${b.phone.replace(/\D/g, "")}`}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <MessageCircle size={12} />
                                  {b.phone}
                                </a>
                              </div>
                              <div className="appointment-meta">
                                <strong>{money(b.price)}</strong>
                                <span className={`badge ${b.status}`}>
                                  {statusLabels[b.status]}
                                </span>
                              </div>
                              <div className="appointment-actions">
                                <select
                                  aria-label={`Estado del turno de ${b.name}`}
                                  value={b.status}
                                  disabled={busy}
                                  onChange={(e) =>
                                    void run(
                                      {
                                        action: "status",
                                        id: b.id,
                                        status: e.target.value,
                                      },
                                      "Estado actualizado.",
                                    )
                                  }
                                >
                                  <option value="confirmed">Confirmado</option>
                                  <option value="completed">Completado</option>
                                  <option value="no_show">No asistió</option>
                                  <option value="cancelled">Cancelado</option>
                                </select>
                              </div>
                            </article>
                          ))
                        ) : (
                          <div className="empty">
                            <CalendarDays size={32} />
                            <h3>
                              {search
                                ? "No encontramos ese cliente"
                                : blocked
                                  ? "Hoy toca una pausa"
                                  : "La agenda está libre"}
                            </h3>
                            <p>
                              {search
                                ? "Probá con otro nombre o teléfono."
                                : blocked
                                  ? "Tus clientes verán el aviso al elegir este día."
                                  : "Compartí tu link para recibir tus primeros turnos."}
                            </p>
                            {!search && !blocked && (
                              <button
                                className="text-button"
                                onClick={copyLink}
                              >
                                Copiar link de reservas <ArrowRight size={16} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="panel-footer">
                        <span className="live-dot" />
                        {configured
                          ? "La agenda se actualiza cada 20 segundos"
                          : "Agenda de demostración"}
                        <span>Hora de Argentina</span>
                      </div>
                    </section>
                    <aside className="agenda-aside">
                      <div className="dark-card">
                        <span className="tiny-label">LA SILLA TE ESPERA</span>
                        <Scissors size={29} />
                        <h3>
                          Tu oficio.
                          <br />
                          Tu ritmo.
                        </h3>
                        <p>
                          Compartí tu página y dejá que tus clientes elijan su
                          próximo turno.
                        </p>
                        <button onClick={copyLink}>
                          Compartir mi agenda <ArrowUpRight size={17} />
                        </button>
                        <div className="stripe" />
                      </div>
                      <section className="panel quick-panel">
                        <h3>Un poco de orden</h3>
                        <button onClick={() => setBlockOpen(true)}>
                          <span className="quick-icon">
                            <LockKeyhole size={18} />
                          </span>
                          <span>
                            <strong>Bloquear un día</strong>
                            <small>Un descanso también es un plan</small>
                          </span>
                          <ChevronRight size={17} />
                        </button>
                        <button onClick={() => setTab("settings")}>
                          <span className="quick-icon">
                            <Clock3 size={18} />
                          </span>
                          <span>
                            <strong>Mis horarios</strong>
                            <small>
                              {data.settings.start} a {data.settings.end}
                            </small>
                          </span>
                          <ChevronRight size={17} />
                        </button>
                      </section>
                      <p className="aside-note">
                        <ShieldCheck size={16} />
                        Tu agenda, bajo control.
                      </p>
                    </aside>
                  </div>
                </>
              )}
              {tab === "blocks" && (
                <section className="panel management-panel">
                  <div className="section-title">
                    <h2>Días sin atención</h2>
                    <span className="badge">
                      {data.blocks.length} bloqueados
                    </span>
                  </div>
                  <p>
                    El aviso aparece al reservar. Los turnos existentes se
                    conservan salvo que elijas cancelarlos al bloquear.
                  </p>
                  {data.blocks.length ? (
                    data.blocks
                      .slice()
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map((b) => (
                        <div className="block-row" key={b.date}>
                          <LockKeyhole size={21} />
                          <div>
                            <strong>{dateLabel(b.date, true)}</strong>
                            <p>{b.reason}</p>
                          </div>
                          <button
                            className="secondary"
                            disabled={busy}
                            onClick={() =>
                              void run(
                                { action: "unblock", date: b.date },
                                "Día habilitado.",
                              )
                            }
                          >
                            Habilitar
                          </button>
                        </div>
                      ))
                  ) : (
                    <div className="empty">
                      <CalendarDays size={30} />
                      <h3>Sin días bloqueados</h3>
                      <p>Cuando necesites una pausa, avisá desde acá.</p>
                    </div>
                  )}
                </section>
              )}
              {tab === "services" && (
                <ServiceSettings data={data} busy={busy} save={run} />
              )}
              {tab === "settings" && (
                <ShopSettings data={data} busy={busy} save={run} />
              )}
              <footer className="dashboard-footer">
                <span>
                  EDDU BARBER <span className="footer-dot">·</span> Hecho para
                  tu oficio.
                </span>
                <span>Menos vueltas. Más cortes.</span>
              </footer>
            </>
          )}
        </main>
        {admin && (
          <nav className="mobile-nav">
            {(
              [
                ["agenda", "Agenda", CalendarDays],
                ["blocks", "Bloqueos", LockKeyhole],
                ["services", "Servicios", Scissors],
                ["settings", "Ajustes", Settings2],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                className={tab === id ? "active" : ""}
                onClick={() => setTab(id)}
              >
                <Icon size={20} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        )}
      </div>
      {bookingOpen && (
        <Modal title="Un nuevo turno" close={() => setBookingOpen(false)}>
          <BookingForm
            data={data}
            busy={busy}
            command={command}
            initialDate={date}
          />
        </Modal>
      )}
      {blockOpen && (
        <Modal
          error={error}
          title="Bloquear un día"
          close={() => setBlockOpen(false)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                await command({
                  action: "block",
                  date: f.get("date"),
                  reason: f.get("reason"),
                  cancel: f.get("cancel") === "on",
                });
                setBlockOpen(false);
                setNotice(
                  "Día bloqueado. El aviso ya está visible al reservar.",
                );
              } catch {}
            }}
          >
            <p className="muted">
              Nadie podrá reservar en esa fecha. Escribí el aviso que verán tus
              clientes.
            </p>
            <label>
              Fecha
              <input
                name="date"
                type="date"
                min={today()}
                defaultValue={date < today() ? today() : date}
                required
              />
            </label>
            <label>
              Aviso para tus clientes
              <textarea
                name="reason"
                defaultValue="Este día no atendemos. Te esperamos en otro horario."
                maxLength={200}
                required
              />
            </label>
            <label className="checkbox">
              <input type="checkbox" name="cancel" />
              Cancelar también los turnos pendientes de ese día
            </label>
            <div className="alert info">
              Si cancelás turnos, contactá a los clientes desde la agenda. No se
              envían mensajes automáticamente.
            </div>
            <button className="primary full" disabled={busy}>
              {busy ? "Guardando…" : "Bloquear día"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Brand() {
  return (
    <Link href="/" className="brand">
      <span className="brand-mark">
        <Scissors size={24} />
      </span>
      <span>
        EDDU<span className="brand-sub">BARBER STUDIO</span>
      </span>
      <i className="brand-stripe" />
    </Link>
  );
}
function Stat({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="stat">
      <div>
        <span className="tiny-label">{label}</span>
        <strong>{value}</strong>
        <p>{detail}</p>
      </div>
      <span className="stat-icon">{icon}</span>
    </div>
  );
}
function Modal({
  title,
  children,
  close,
  error,
}: {
  title: string;
  children: React.ReactNode;
  close: () => void;
  error?: string;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <dialog
        open
        className="modal"
        aria-modal="true"
        aria-label={title}
        onKeyDown={(e) => {
          if (e.key === "Escape") close();
          if (e.key === "Tab") {
            const nodes = e.currentTarget.querySelectorAll<HTMLElement>(
              "button:not(:disabled),input,select,textarea,a[href]",
            );
            const first = nodes[0],
              last = nodes[nodes.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <button
            autoFocus
            className="icon-button"
            onClick={close}
            aria-label="Cerrar"
          >
            <X />
          </button>
        </div>
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        {children}
      </dialog>
    </div>
  );
}

function BookingForm({
  data,
  busy,
  command,
  initialDate,
}: {
  data: Data;
  busy: boolean;
  command: (p: Command) => Promise<Booking | undefined>;
  initialDate?: string;
}) {
  const [serviceId, setServiceId] = useState(
    data.services.find((s) => s.active)?.id ?? "",
  );
  const [date, setDate] = useState(
    initialDate && initialDate >= today() ? initialDate : today(),
  );
  const [time, setTime] = useState("");
  const [created, setCreated] = useState<Booking | null>(null);
  const [error, setError] = useState("");
  const service = data.services.find((s) => s.id === serviceId && s.active);
  const available = service ? slots(data, date, service.duration) : [];
  const block = data.blocks.find((b) => b.date === date);
  const closed = !data.settings.days.includes(
    new Date(date + "T12:00:00").getDay(),
  );
  if (created)
    return (
      <section className="confirmation panel">
        <span className="confirmation-check">
          <Check size={32} />
        </span>
        <span className="eyebrow">NOS VEMOS EN LA SILLA</span>
        <h2>Tu turno está confirmado.</h2>
        <p>{created.name}, ya reservamos tu lugar.</p>
        <div className="ticket">
          <strong>{created.service_name}</strong>
          <span>
            {dateLabel(created.date, true)} · {created.time}
          </span>
          <span>
            {created.duration} minutos · {money(created.price)}
          </span>
          <small>
            Guardá este enlace privado para consultar o cancelar tu turno.
          </small>
          <Link
            className="primary"
            href={`/turno?id=${created.id}&token=${created.token}`}
          >
            Ver mi turno <ArrowRight size={17} />
          </Link>
        </div>
        <button
          className="text-button"
          onClick={() => {
            setCreated(null);
            setTime("");
          }}
        >
          Reservar otro turno
        </button>
      </section>
    );
  return (
    <form
      className="booking-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        const f = new FormData(e.currentTarget);
        try {
          const booking = await command({
            action: "book",
            service_id: serviceId,
            date,
            time,
            name: f.get("name"),
            phone: f.get("phone"),
            website: f.get("website"),
          });
          if (booking) setCreated(booking);
        } catch (err) {
          setError(err instanceof Error ? err.message : "No se pudo reservar.");
          setTime("");
        }
      }}
    >
      <div className="booking-section">
        <div className="step-heading">
          <span>01</span>
          <div>
            <h2>Elegí tu servicio</h2>
            <p>El primer paso para tu próximo look.</p>
          </div>
        </div>
        <div className="service-options">
          {data.services
            .filter((s) => s.active)
            .map((s) => (
              <button
                type="button"
                key={s.id}
                onClick={() => {
                  setServiceId(s.id);
                  setTime("");
                }}
                className={
                  serviceId === s.id
                    ? "service-option selected"
                    : "service-option"
                }
              >
                <Scissors size={22} />
                <span>
                  <strong>{s.name}</strong>
                  <small>{s.description}</small>
                  <span className="service-duration">
                    <Clock3 size={12} />
                    {s.duration} min
                  </span>
                </span>
                <span className="service-price">
                  {money(s.price)}
                  <i>{serviceId === s.id && <Check size={12} />}</i>
                </span>
              </button>
            ))}
        </div>
      </div>
      <div className="booking-section">
        <div className="step-heading">
          <span>02</span>
          <div>
            <h2>Encontrá tu momento</h2>
            <p>Los horarios se muestran en hora de Argentina.</p>
          </div>
        </div>
        <label>
          Fecha
          <input
            type="date"
            value={date}
            min={today()}
            max={addDays(today(), 60)}
            onChange={(e) => {
              setDate(e.target.value);
              setTime("");
            }}
            required
          />
        </label>
        {block ? (
          <div className="blocked-notice">
            <LockKeyhole size={21} />
            <div>
              <strong>Este día no atendemos</strong>
              <p>{block.reason}</p>
            </div>
          </div>
        ) : closed ? (
          <div className="alert info">
            Este día la barbería está cerrada. Elegí otra fecha.
          </div>
        ) : (
          <div className="time-grid">
            {available.length ? (
              available.map((t) => (
                <button
                  type="button"
                  key={t}
                  className={time === t ? "selected" : ""}
                  onClick={() => setTime(t)}
                >
                  {t}
                </button>
              ))
            ) : (
              <p className="muted">
                No quedan horarios disponibles. Probá otro día.
              </p>
            )}
          </div>
        )}
      </div>
      <div className="booking-section">
        <div className="step-heading">
          <span>03</span>
          <div>
            <h2>Solo faltan tus datos</h2>
            <p>Sin crear una cuenta. Así de simple.</p>
          </div>
        </div>
        <div className="form-grid">
          <label>
            Nombre y apellido
            <input
              name="name"
              autoComplete="name"
              placeholder="Tu nombre"
              minLength={2}
              maxLength={80}
              required
            />
          </label>
          <label>
            WhatsApp con código de país
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+54 9 11 1234 5678"
              pattern="\+?[0-9\s\(\)\-]{8,22}"
              minLength={8}
              maxLength={22}
              required
            />
          </label>
        </div>
        <input
          className="honeypot"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />
        <p className="privacy-note">
          <ShieldCheck size={14} />
          Tus datos solo se usan para gestionar este turno.
        </p>
      </div>
      {error && (
        <div role="alert" className="alert error">
          {error}
        </div>
      )}
      <div className="booking-summary">
        <div>
          <span>{service?.name ?? "Elegí un servicio"}</span>
          <strong>{service ? money(service.price) : "—"}</strong>
          <small>Pagás en la barbería</small>
        </div>
        <button
          className="primary"
          disabled={busy || !time || !available.includes(time) || !service}
        >
          {busy ? "Reservando…" : "Confirmar turno"}
          <ArrowRight size={18} />
        </button>
      </div>
    </form>
  );
}

function ServiceSettings({
  data,
  busy,
  save,
}: {
  data: Data;
  busy: boolean;
  save: (p: Command, m: string) => Promise<void>;
}) {
  return (
    <div className="service-edit-grid">
      {[
        ...data.services,
        {
          id: "new",
          name: "",
          description: "",
          duration: 30,
          price: 0,
          active: true,
        },
      ].map((s) => (
        <form
          className="panel service-editor"
          key={`${s.id}-${s.name}`}
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void save(
              {
                action: "service",
                service: {
                  id: s.id === "new" ? crypto.randomUUID() : s.id,
                  name: f.get("name"),
                  description: f.get("description"),
                  duration: Number(f.get("duration")),
                  price: Number(f.get("price")),
                  active: f.get("active") === "on",
                },
              },
              "Servicio guardado.",
            );
          }}
        >
          <span className="service-editor-icon">
            <Scissors />
          </span>
          <h2>{s.id === "new" ? "Agregar servicio" : s.name}</h2>
          <label>
            Nombre
            <input name="name" defaultValue={s.name} maxLength={60} required />
          </label>
          <label>
            Descripción
            <input
              name="description"
              defaultValue={s.description}
              maxLength={120}
            />
          </label>
          <div className="form-grid">
            <label>
              Duración
              <select name="duration" defaultValue={s.duration}>
                {[30, 60, 90, 120].map((n) => (
                  <option key={n} value={n}>
                    {n} min
                  </option>
                ))}
              </select>
            </label>
            <label>
              Precio (ARS)
              <input
                type="number"
                min={0}
                max={1000000}
                step={100}
                name="price"
                defaultValue={s.price}
                required
              />
            </label>
          </div>
          <label className="checkbox">
            <input type="checkbox" name="active" defaultChecked={s.active} />
            Visible para reservar
          </label>
          <button className="primary full" disabled={busy}>
            {s.id === "new" ? "Agregar servicio" : "Guardar cambios"}
          </button>
        </form>
      ))}
    </div>
  );
}

function ShopSettings({
  data,
  busy,
  save,
}: {
  data: Data;
  busy: boolean;
  save: (p: Command, m: string) => Promise<void>;
}) {
  const s = data.settings;
  const [error, setError] = useState("");
  return (
    <form
      className="panel settings-form"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        if (String(f.get("start")) >= String(f.get("end"))) {
          setError("El cierre debe ser posterior a la apertura.");
          return;
        }
        setError("");
        void save(
          {
            action: "settings",
            settings: {
              name: f.get("name"),
              address: f.get("address"),
              phone: f.get("phone"),
              start: f.get("start"),
              end: f.get("end"),
              days: f.getAll("days").map(Number),
            },
          },
          "Configuración guardada.",
        );
      }}
    >
      <h2>Datos de la barbería</h2>
      <label>
        Nombre
        <input name="name" defaultValue={s.name} required maxLength={60} />
      </label>
      <label>
        Dirección
        <input
          name="address"
          defaultValue={s.address}
          required
          maxLength={150}
        />
      </label>
      <label>
        WhatsApp
        <input name="phone" type="tel" defaultValue={s.phone} maxLength={22} />
      </label>
      <hr />
      <h2>Horarios de atención</h2>
      <p className="muted">
        Los cambios afectan nuevas reservas. Los turnos existentes se mantienen.
      </p>
      <div className="form-grid">
        <label>
          Apertura
          <input
            name="start"
            type="time"
            step={1800}
            defaultValue={s.start}
            required
          />
        </label>
        <label>
          Cierre
          <input
            name="end"
            type="time"
            step={1800}
            defaultValue={s.end}
            required
          />
        </label>
      </div>
      <fieldset>
        <legend>Días de atención</legend>
        <div className="weekday-checkboxes">
          {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d, i) => (
            <label className="checkbox" key={d}>
              <input
                type="checkbox"
                name="days"
                value={i}
                defaultChecked={s.days.includes(i)}
              />
              {d}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="muted">
        Reservas hasta 60 días hacia adelante. Zona horaria: Argentina.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button className="primary" disabled={busy}>
        Guardar configuración <Check size={17} />
      </button>
    </form>
  );
}

function Login({
  error,
  onError,
}: {
  error: string;
  onError: (s: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <main className="login-page">
      <Brand />
      <form
        className="panel login-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          onError("");
          const f = new FormData(e.currentTarget);
          const { error } = await browserDb().auth.signInWithPassword({
            email: String(f.get("email")),
            password: String(f.get("password")),
          });
          if (error) onError("Email o contraseña incorrectos.");
          setBusy(false);
        }}
      >
        <span className="eyebrow">SOLO PARA EL BARBERO</span>
        <h1>
          Tu espacio.
          <br />
          Tu agenda.
        </h1>
        <label>
          Email
          <input type="email" name="email" autoComplete="username" required />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
          />
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="primary full" disabled={busy}>
          {busy ? "Ingresando…" : "Entrar al panel"}
          <ArrowRight size={18} />
        </button>
        <Link href="/" className="text-button">
          Volver a reservas
        </Link>
      </form>
    </main>
  );
}
