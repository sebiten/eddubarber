import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { addDays, today } from "../src/lib/domain";

test("Postgres: reserva, exclusión, bloqueo, cancelación y permisos", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon; create role authenticated; create role service_role bypassrls;",
    );
    await db.exec(await readFile("supabase/schema.sql", "utf8"));
    let date = addDays(today(), 1);
    while (new Date(date + "T12:00:00").getDay() === 0) date = addDays(date, 1);
    const book = async (time: string, phone = "5491112345678") =>
      (
        await db.query<{
          booking: {
            id: string;
            token: string;
            duration: number;
            price: number;
          };
        }>(
          "select public.barber_book($1::date,$2::time,'combo','Cliente de prueba',$3) as booking",
          [date, time, phone],
        )
      ).rows[0].booking;
    const first = await book("10:00");
    assert.equal(first.duration, 60);
    assert.equal(first.price, 18000);
    await assert.rejects(
      () => db.query("delete from public.barber_services where id='combo'"),
      /foreign key constraint/,
    );
    const deleted = await db.query<{ id: string }>(
      "delete from public.barber_services where id='barba' returning id",
    );
    assert.deepEqual(deleted.rows, [{ id: "barba" }]);
    const preserved = await db.query<{ service_name: string; price: number }>(
      "select service_name, price from public.barber_bookings where id=$1",
      [first.id],
    );
    assert.deepEqual(preserved.rows, [{ service_name: "Corte + barba", price: 18000 }]);
    await assert.rejects(
      () => book("10:30", "5491199999999"),
      /acaba de reservarse/,
    );
    await assert.rejects(
      () =>
        db.query("select public.barber_cancel($1::uuid,gen_random_uuid())", [
          first.id,
        ]),
      /no es válido/,
    );
    await db.query("select public.barber_cancel($1::uuid,$2::uuid)", [
      first.id,
      first.token,
    ]);
    const replacement = await book("10:00");
    await assert.rejects(
      () =>
        db.query("select public.barber_status($1::uuid,'confirmed')", [
          first.id,
        ]),
      /horario ya está ocupado/,
    );
    await db.query(
      "select public.barber_block($1::date,'Cerrado por enfermedad',true)",
      [date],
    );
    const result = await db.query<{ status: string }>(
      "select status from public.barber_bookings where id=$1",
      [replacement.id],
    );
    assert.equal(result.rows[0].status, "cancelled");
    await assert.rejects(() => book("14:00"), /no atendemos/);
    await assert.rejects(
      () =>
        db.query("select public.barber_status($1::uuid,'confirmed')", [
          replacement.id,
        ]),
      /Habilitá el día/,
    );
    await db.query("delete from public.barber_blocks where date=$1", [date]);
    await book("14:00");
    const permissions = await db.query<{ read: boolean; execute: boolean }>(
      "select has_table_privilege('anon','public.barber_bookings','SELECT') as read, has_function_privilege('anon','public.barber_book(date,time,text,text,text)','EXECUTE') as execute",
    );
    assert.deepEqual(permissions.rows[0], { read: false, execute: false });
  } finally {
    await db.close();
  }
});
