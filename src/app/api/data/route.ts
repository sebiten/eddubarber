import { NextRequest, NextResponse } from "next/server";
import { isAdmin, noStore, serverDb } from "@/lib/server";
import { addDays, today } from "@/lib/domain";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    const admin = req.nextUrl.searchParams.get("admin") === "1";
    if (admin && !(await isAdmin(req)))
      return NextResponse.json(
        { error: "Acceso no autorizado." },
        { status: 401, headers: noStore },
      );
    const db = serverDb();
    const results = await Promise.all([
      db.from("barber_services").select("*").order("price"),
      db
        .from("barber_settings")
        .select("name,address,phone,start,end,days")
        .eq("id", 1)
        .single(),
      db
        .from("barber_blocks")
        .select("date,reason")
        .gte("date", admin ? "2000-01-01" : today()),
      (async () => {
        const rows: Record<string, unknown>[] = [];
        for (let offset = 0; ; offset += 1000) {
          const query = admin
            ? db
                .from("barber_bookings")
                .select(
                  "id,date,time,duration,service_id,service_name,price,name,phone,status",
                )
            : db
                .from("barber_bookings")
                .select("date,time,duration,status")
                .gte("date", today())
                .lte("date", addDays(today(), 60))
                .neq("status", "cancelled");
          const result = await query
            .order("date")
            .order("id")
            .range(offset, offset + 999);
          if (result.error) return { data: null, error: result.error };
          rows.push(...result.data);
          if (result.data.length < 1000) break;
        }
        return { data: rows, error: null };
      })(),
    ]);
    if (results.some((r) => r.error))
      throw new Error("No se pudo consultar la base de datos.");
    return NextResponse.json(
      {
        services: results[0].data,
        settings: results[1].data,
        blocks: results[2].data,
        bookings: results[3].data,
      },
      { headers: noStore },
    );
  } catch {
    return NextResponse.json(
      {
        error: "No se pudo cargar la agenda. Revisá la conexión con Supabase.",
      },
      { status: 503, headers: noStore },
    );
  }
}
