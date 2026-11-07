import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { noStore, serverDb } from "@/lib/server";
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id"),
    token = req.nextUrl.searchParams.get("token");
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(token).success)
    return NextResponse.json(
      { error: "Enlace inválido." },
      { status: 400, headers: noStore },
    );
  try {
    const { data, error } = await serverDb()
      .from("barber_bookings")
      .select("id,date,time,duration,service_name,price,name,status")
      .eq("id", id)
      .eq("token", token)
      .single();
    if (error)
      return NextResponse.json(
        { error: "No encontramos el turno. Revisá el enlace privado." },
        { status: 404, headers: noStore },
      );
    return NextResponse.json(data, {
      headers: { ...noStore, "Referrer-Policy": "no-referrer" },
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo consultar el turno." },
      { status: 503, headers: noStore },
    );
  }
}
