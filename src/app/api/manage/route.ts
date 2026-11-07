import { NextRequest, NextResponse } from "next/server";
import { commandSchema, isAdmin, noStore, serverDb } from "@/lib/server";
export async function POST(req: NextRequest) {
  try {
    const parsed = commandSchema.safeParse(await req.json());
    if (!parsed.success)
      return NextResponse.json(
        { error: "Revisá los datos ingresados." },
        { status: 400, headers: noStore },
      );
    const p = parsed.data;
    if (p.action !== "book" && p.action !== "cancel" && !(await isAdmin(req)))
      return NextResponse.json(
        { error: "Acceso no autorizado." },
        { status: 401, headers: noStore },
      );
    const db = serverDb();
    let result;
    if (p.action === "book")
      result = await db.rpc("barber_book", {
        p_date: p.date,
        p_time: p.time,
        p_service: p.service_id,
        p_name: p.name,
        p_phone: p.phone,
      });
    else if (p.action === "block")
      result = await db.rpc("barber_block", {
        p_date: p.date,
        p_reason: p.reason,
        p_cancel: p.cancel,
      });
    else if (p.action === "status")
      result = await db.rpc("barber_status", {
        p_id: p.id,
        p_status: p.status,
      });
    else if (p.action === "cancel")
      result = await db.rpc("barber_cancel", { p_id: p.id, p_token: p.token });
    else if (p.action === "unblock")
      result = await db.from("barber_blocks").delete().eq("date", p.date);
    else if (p.action === "service")
      result = await db.from("barber_services").upsert(p.service);
    else
      result = await db
        .from("barber_settings")
        .upsert({ id: 1, ...p.settings });
    if (result.error) {
      const message =
        result.error.code === "P0001"
          ? result.error.message
          : "No se pudo guardar el cambio. Volvé a intentar.";
      return NextResponse.json(
        { error: message },
        { status: 409, headers: noStore },
      );
    }
    return NextResponse.json(
      { ok: true, ...(p.action === "book" ? { booking: result.data } : {}) },
      { headers: noStore },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "No se pudo procesar la solicitud. Revisá la conexión e intentá otra vez.",
      },
      { status: 503, headers: noStore },
    );
  }
}
