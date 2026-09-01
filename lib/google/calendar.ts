import "server-only";

import { createAdminSupabase } from "@/lib/supabase/admin";

type GoogleConnection = {
  user_id: string;
  google_email: string | null;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
};

export type GoogleCalendarEvent = {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
};

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export async function persistGoogleCalendarConnection({
  userId,
  email,
  accessToken,
  refreshToken,
}: {
  userId: string;
  email?: string | null;
  accessToken: string;
  refreshToken?: string | null;
}) {
  const admin = createAdminSupabase();
  const { data: current } = await admin
    .from("google_calendar_connections")
    .select("refresh_token")
    .eq("user_id", userId)
    .maybeSingle();

  const { error } = await admin.from("google_calendar_connections").upsert({
    user_id: userId,
    google_email: email || null,
    access_token: accessToken,
    refresh_token: refreshToken || current?.refresh_token || null,
    token_expires_at: new Date(Date.now() + 55 * 60 * 1000).toISOString(),
    connected_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  if (error) throw error;
}

export async function getGoogleCalendarConnection(userId: string) {
  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from("google_calendar_connections")
    .select("user_id,google_email,access_token,refresh_token,token_expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data as GoogleConnection | null) || null;
}

async function refreshGoogleAccessToken(connection: GoogleConnection) {
  if (!connection.refresh_token) throw new Error("Google Calendar precisa ser reconectado para renovar o acesso.");

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Credenciais OAuth do Google não configuradas no servidor.");

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || "Não foi possível renovar o acesso ao Google Calendar.");
  }

  const expiresAt = new Date(Date.now() + Number(payload.expires_in || 3600) * 1000).toISOString();
  const admin = createAdminSupabase();
  const { error } = await admin.from("google_calendar_connections").update({
    access_token: payload.access_token,
    token_expires_at: expiresAt,
  }).eq("user_id", connection.user_id);
  if (error) throw error;

  return payload.access_token as string;
}

export async function getGoogleCalendarAccessToken(userId: string) {
  const connection = await getGoogleCalendarConnection(userId);
  if (!connection) throw new Error("Google Calendar não conectado.");

  const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0;
  if (expiresAt > Date.now() + 5 * 60 * 1000) return connection.access_token;
  return refreshGoogleAccessToken(connection);
}

async function googleRequest(userId: string, path: string, init?: RequestInit) {
  const token = await getGoogleCalendarAccessToken(userId);
  const response = await fetch(`${CALENDAR_API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (response.status === 401) {
    const connection = await getGoogleCalendarConnection(userId);
    if (connection?.refresh_token) {
      const refreshed = await refreshGoogleAccessToken(connection);
      return fetch(`${CALENDAR_API}${path}`, {
        ...init,
        headers: {
          authorization: `Bearer ${refreshed}`,
          "content-type": "application/json",
          ...(init?.headers || {}),
        },
        cache: "no-store",
      });
    }
  }

  return response;
}

export async function listGoogleCalendarEvents(userId: string, timeMin: string, timeMax: string) {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "2500",
  });
  const response = await googleRequest(userId, `/calendars/primary/events?${params.toString()}`);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || "Não foi possível carregar os eventos do Google Calendar.");
  return (payload.items || []) as GoogleCalendarEvent[];
}

export async function createGoogleCalendarEvent(userId: string, event: {
  summary: string;
  description?: string;
  start: string;
  end: string;
}) {
  const response = await googleRequest(userId, "/calendars/primary/events?sendUpdates=none", {
    method: "POST",
    body: JSON.stringify({
      summary: event.summary,
      description: event.description || undefined,
      start: { dateTime: event.start },
      end: { dateTime: event.end },
    }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || "Não foi possível criar o evento no Google Calendar.");
  return payload as GoogleCalendarEvent;
}
