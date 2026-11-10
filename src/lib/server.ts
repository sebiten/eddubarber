import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { NextRequest } from "next/server";

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v + "T12:00:00Z");
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "Fecha inválida");
export const timeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[03]0$/);
export const serviceSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().trim().min(2).max(60),
  description: z.string().max(120),
  duration: z.union([
    z.literal(30),
    z.literal(60),
    z.literal(90),
    z.literal(120),
  ]),
  price: z.number().int().min(0).max(1000000),
  active: z.boolean(),
});
export const settingsSchema = z
  .object({
    name: z.string().trim().min(2).max(60),
    address: z.string().trim().min(2).max(150),
    phone: z.string().max(22),
    start: timeSchema,
    end: timeSchema,
    days: z.array(z.number().int().min(0).max(6)).max(7),
  })
  .refine((s) => s.start < s.end, "El cierre debe ser posterior a la apertura");
export const commandSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("book"),
    service_id: z.string().min(1).max(80),
    date: dateSchema,
    time: timeSchema,
    name: z.string().trim().min(2).max(80),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[\d\s()-]{8,22}$/)
      .refine((v) => v.replace(/\D/g, "").length >= 8),
    website: z.string().max(0).nullish(),
  }),
  z.object({
    action: z.literal("status"),
    id: z.uuid(),
    status: z.enum(["confirmed", "completed", "cancelled", "no_show"]),
  }),
  z.object({
    action: z.literal("block"),
    date: dateSchema,
    reason: z.string().trim().min(3).max(200),
    cancel: z.boolean(),
  }),
  z.object({ action: z.literal("unblock"), date: dateSchema }),
  z.object({ action: z.literal("service"), service: serviceSchema }),
  z.object({
    action: z.literal("delete_service"),
    id: z.string().trim().min(1).max(80),
  }),
  z.object({ action: z.literal("settings"), settings: settingsSchema }),
  z.object({ action: z.literal("cancel"), id: z.uuid(), token: z.uuid() }),
]);
export function serverDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("La conexión con Supabase no está configurada.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function isAdmin(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token || !process.env.BARBER_USER_ID) return false;
  const { data, error } = await serverDb().auth.getUser(token);
  return !error && data.user?.id === process.env.BARBER_USER_ID;
}
export const noStore = { "Cache-Control": "no-store" };
