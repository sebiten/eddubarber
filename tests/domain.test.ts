import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, demoData, slots } from "../src/lib/domain";
import { commandSchema } from "../src/lib/server";

const day = "2030-11-04"; // lunes
const now = new Date("2030-11-01T00:00:00Z");
test("un bloqueo impide todas las reservas del día", () => {
  const d = demoData();
  d.blocks.push({ date: day, reason: "No atendemos" });
  assert.deepEqual(slots(d, day, 30, now), []);
});
test("no ofrece horas que superponen un servicio de una hora", () => {
  const d = demoData();
  d.bookings.push({
    id: "1",
    date: day,
    time: "10:00",
    duration: 60,
    service_id: "combo",
    service_name: "Combo",
    price: 18000,
    name: "Cliente",
    phone: "5491112345678",
    status: "confirmed",
  });
  const available = slots(d, day, 60, now);
  assert.ok(available.includes("09:00"));
  assert.ok(!available.includes("09:30"));
  assert.ok(!available.includes("10:00"));
  assert.ok(!available.includes("10:30"));
  assert.ok(available.includes("11:00"));
});
test("una cancelación libera el horario y no_show lo conserva", () => {
  const d = demoData();
  d.bookings.push({
    id: "1",
    date: day,
    time: "10:00",
    duration: 30,
    service_id: "corte",
    service_name: "Corte",
    price: 12000,
    name: "Cliente",
    phone: "5491112345678",
    status: "cancelled",
  });
  assert.ok(slots(d, day, 30, now).includes("10:00"));
  d.bookings[0].status = "no_show";
  assert.ok(!slots(d, day, 30, now).includes("10:00"));
});
test("respeta el horario de cierre y los días de atención", () => {
  const d = demoData();
  assert.ok(!slots(d, day, 60, now).includes("19:30"));
  assert.deepEqual(slots(d, "2030-11-03", 30, now), []);
});
test("no muestra horas pasadas usando la zona de Argentina", () => {
  const d = demoData();
  const available = slots(d, day, 30, new Date(`${day}T12:00:00Z`));
  assert.ok(!available.includes("09:00"));
  assert.ok(available.includes("09:30"));
});
test("suma días cruzando mes y año", () => {
  assert.equal(addDays("2030-12-31", 1), "2031-01-01");
});
test("API rechaza fechas inexistentes, horarios inválidos y datos malformados", () => {
  const booking = {
    action: "book",
    date: "2030-02-30",
    time: "10:00",
    service_id: "corte",
    name: "Juan",
    phone: "5491112345678",
  };
  assert.equal(commandSchema.safeParse(booking).success, false);
  assert.equal(
    commandSchema.safeParse({ ...booking, date: day, time: "10:15" }).success,
    false,
  );
  assert.equal(
    commandSchema.safeParse({ ...booking, date: day, phone: "        " })
      .success,
    false,
  );
  assert.equal(
    commandSchema.safeParse({ ...booking, date: day }).success,
    true,
  );
});
test("API rechaza configuración con cierre anterior a apertura", () => {
  const d = demoData();
  assert.equal(
    commandSchema.safeParse({
      action: "settings",
      settings: { ...d.settings, start: "20:00", end: "09:00" },
    }).success,
    false,
  );
});
