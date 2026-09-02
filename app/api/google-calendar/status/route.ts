import { NextResponse } from "next/server";
import { getGoogleCalendarConnection } from "@/lib/google/calendar";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const connection = await getGoogleCalendarConnection(user.id);
    return NextResponse.json({
      connected: Boolean(connection),
      email: connection?.google_email || user.email || null,
    });
  } catch (error) {
    return NextResponse.json({
      connected: false,
      error: error instanceof Error ? error.message : "Não foi possível verificar o Google Calendar",
    }, { status: 500 });
  }
}
