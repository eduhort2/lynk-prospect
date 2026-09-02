import { addHours, addMonths, subMonths } from "date-fns";
import { NextResponse } from "next/server";
import { createGoogleCalendarEvent, listGoogleCalendarEvents } from "@/lib/google/calendar";
import { createServerSupabase } from "@/lib/supabase/server";

async function getAuthenticatedUser() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const url = new URL(request.url);
  const now = new Date();
  const timeMin = url.searchParams.get("timeMin") || subMonths(now, 1).toISOString();
  const timeMax = url.searchParams.get("timeMax") || addMonths(now, 3).toISOString();

  try {
    const events = await listGoogleCalendarEvents(user.id, timeMin, timeMax);
    return NextResponse.json({ events });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível carregar o Google Calendar" }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const body = await request.json();
    if (!body?.summary || !body?.start) {
      return NextResponse.json({ error: "Título e data inicial são obrigatórios" }, { status: 400 });
    }

    const start = new Date(body.start);
    if (Number.isNaN(start.getTime())) return NextResponse.json({ error: "Data inválida" }, { status: 400 });
    const end = body.end ? new Date(body.end) : addHours(start, 1);

    const event = await createGoogleCalendarEvent(user.id, {
      summary: String(body.summary),
      description: body.description ? String(body.description) : undefined,
      start: start.toISOString(),
      end: end.toISOString(),
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível criar o evento" }, { status: 502 });
  }
}
