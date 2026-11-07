export type Service = {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  active: boolean;
};
export type Booking = {
  id: string;
  date: string;
  time: string;
  duration: number;
  service_id: string;
  service_name: string;
  price: number;
  name: string;
  phone: string;
  status: "confirmed" | "completed" | "cancelled" | "no_show";
  token?: string;
};
export type Block = { date: string; reason: string };
export type Settings = {
  name: string;
  address: string;
  phone: string;
  start: string;
  end: string;
  days: number[];
};
export type Data = {
  services: Service[];
  bookings: Booking[];
  blocks: Block[];
  settings: Settings;
};
export const defaults: Settings = {
  name: "EDDU BARBER",
  address: "Tu barbería de confianza",
  phone: "",
  start: "09:00",
  end: "20:00",
  days: [1, 2, 3, 4, 5, 6],
};
export const services: Service[] = [
  {
    id: "corte",
    name: "Corte de pelo",
    description: "Un buen corte. Tu propio estilo.",
    duration: 30,
    price: 12000,
    active: true,
  },
  {
    id: "barba",
    name: "Perfilado de barba",
    description: "Líneas prolijas, terminación impecable.",
    duration: 30,
    price: 8000,
    active: true,
  },
  {
    id: "combo",
    name: "Corte + barba",
    description: "El servicio completo para renovar tu look.",
    duration: 60,
    price: 18000,
    active: true,
  },
];
export function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function addDays(date: string, n: number) {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export const minutes = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
export const clock = (n: number) =>
  `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
export const money = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
export const dateLabel = (date: string, long = false) =>
  new Intl.DateTimeFormat("es-AR", {
    weekday: long ? "long" : "short",
    day: "numeric",
    month: long ? "long" : "short",
  }).format(new Date(date + "T12:00:00"));
export function slots(
  data: Data,
  date: string,
  duration: number,
  now = new Date(),
) {
  if (
    data.blocks.some((b) => b.date === date) ||
    !data.settings.days.includes(new Date(date + "T12:00:00").getDay())
  )
    return [];
  const result: string[] = [];
  for (
    let t = minutes(data.settings.start);
    t + duration <= minutes(data.settings.end);
    t += 30
  ) {
    const time = clock(t);
    if (new Date(`${date}T${time}:00-03:00`) <= now) continue;
    if (
      !data.bookings.some(
        (b) =>
          b.date === date &&
          b.status !== "cancelled" &&
          t < minutes(b.time) + b.duration &&
          t + duration > minutes(b.time),
      )
    )
      result.push(time);
  }
  return result;
}
export function demoData(): Data {
  return { services, settings: defaults, blocks: [], bookings: [] };
}
