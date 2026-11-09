import { addDays, demoData, today, type Booking, type Data } from "./domain";

export const previewStorageKey = "eddu-barber-preview-v1";

export function previewData(): Data {
  const data = structuredClone(demoData());
  const date = today();
  const examples: [string, string, number, Booking["status"]][] = [
    ["09:00", "Martín · ejemplo", 0, "completed"],
    ["10:00", "Lucas · ejemplo", 2, "completed"],
    ["12:00", "Nicolás · ejemplo", 1, "cancelled"],
    ["15:00", "Tomás · ejemplo", 0, "confirmed"],
    ["16:00", "Santiago · ejemplo", 2, "confirmed"],
    ["18:30", "Mateo · ejemplo", 0, "confirmed"],
  ];
  data.bookings = examples.map(([time, name, index, status], i) => {
    const service = data.services[index];
    return {
      id: `example-${i}`,
      date,
      time,
      name,
      status,
      phone: "",
      duration: service.duration,
      service_id: service.id,
      service_name: service.name,
      price: service.price,
    };
  });
  // El próximo lunes, nunca el día actual, muestra un cierre de ejemplo.
  let blocked = addDays(date, 1);
  while (new Date(blocked + "T12:00:00").getDay() !== 1)
    blocked = addDays(blocked, 1);
  data.blocks = [
    {
      date: blocked,
      reason: "Ejemplo: este lunes no atendemos. Elegí otro día para tu turno.",
    },
  ];
  return data;
}
