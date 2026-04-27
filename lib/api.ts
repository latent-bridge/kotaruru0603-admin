export const API_BASE =
  process.env.NEXT_PUBLIC_CHAT_API_BASE ?? "https://chat.latent-bridge.com";

export const SITE_ID =
  process.env.NEXT_PUBLIC_SITE_ID ?? "kotaruru0603";

export const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "https://kotaruru0603.latent-bridge.com";

export type AdminUser = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  has_discord: boolean;
  has_google: boolean;
  has_email: boolean;
  is_admin: boolean;
  tag: string;
};

// Reads the admin-only session (separate cookie from the public site's
// /me) so admin login state never bleeds into the fan-site.
export async function fetchAdminMe(): Promise<AdminUser | null> {
  const res = await fetch(`${API_BASE}/admin/me`, { credentials: "include" });
  if (res.status !== 200) return null;
  return (await res.json()) as AdminUser;
}

async function jsonRequest<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: "include",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok && res.status !== 207) {
    const text = await res.text().catch(() => "");
    throw new Error(`${method} ${path} ${res.status}: ${text || res.statusText}`);
  }
  return (await res.json()) as T;
}

export type ScheduleEntry = {
  date: string;       // YYYY-MM-DD (JST)
  title: string | null;
  time: string | null;
  tags: string[];
  emoji: string | null;
  note: string | null;
};

export type ScheduleResponse = {
  start: string;
  end: string;
  entries: ScheduleEntry[];
};

export function getSchedule(days = 14, siteId = SITE_ID) {
  return jsonRequest<ScheduleResponse>(
    "GET",
    `/admin/schedule/${siteId}?days=${days}`,
  );
}

export function putSchedule(
  start: string,
  end: string,
  entries: ScheduleEntry[],
  siteId = SITE_ID,
) {
  return jsonRequest<{
    ok: true;
    start: string;
    end: string;
    count: number;
    dispatch: { dispatched: boolean; reason?: string };
  }>("PUT", `/admin/schedule/${siteId}`, { start, end, entries });
}

export type LiveState = {
  status: "live" | "offline";
  video_id: string | null;
  started_at: number | null;
  ended_at: number | null;
  end_reason: string | null;
  poll_state: string | null;
  last_polled_at: number | null;
};

export function getLiveState(siteId = SITE_ID) {
  return jsonRequest<LiveState>("GET", `/admin/live/${siteId}`);
}

export function startLive(videoId?: string, siteId = SITE_ID) {
  return jsonRequest<{ ok: true; status: "live"; video_id: string }>(
    "POST",
    `/admin/live/${siteId}/start`,
    videoId ? { video_id: videoId } : {},
  );
}

export function stopLive(siteId = SITE_ID) {
  return jsonRequest<{ ok: true; status: "offline" }>(
    "POST",
    `/admin/live/${siteId}/stop`,
    {},
  );
}

export function forceOffline(siteId = SITE_ID) {
  return jsonRequest<{ ok: true; status: "offline" }>(
    "POST",
    `/admin/live/${siteId}/force_offline`,
    {},
  );
}

export type ChatMessage = {
  id: string;
  author: string;
  content: string;
  timestamp: number;
};

// Admin variant returns ALL messages (including hidden / deleted) so the
// moderator can see what they've acted on. Public /chat/:siteId/messages
// continues to filter for the fan site.
export function getChatMessages(siteId = SITE_ID) {
  return jsonRequest<{ messages: ChatMessage[] }>(
    "GET",
    `/admin/chat/${siteId}/messages`,
  );
}

export function getHidden(siteId = SITE_ID) {
  return jsonRequest<{
    hidden: { message_id: string; action: "hide" | "delete" }[];
  }>("GET", `/admin/chat/${siteId}/hidden`);
}

export function hideMessage(messageId: string, reason?: string, siteId = SITE_ID) {
  return jsonRequest<{ ok: true; action: "hide" }>(
    "POST",
    `/admin/chat/${siteId}/messages/${messageId}/hide`,
    reason ? { reason } : {},
  );
}

export function unhideMessage(messageId: string, siteId = SITE_ID) {
  return jsonRequest<{ ok: true; action: "unhide" }>(
    "DELETE",
    `/admin/chat/${siteId}/messages/${messageId}/hide`,
  );
}

export function deleteMessage(messageId: string, siteId = SITE_ID) {
  return jsonRequest<{
    ok: true;
    local: "hidden";
    discord: "deleted" | "failed";
    reason?: string;
  }>("POST", `/admin/chat/${siteId}/messages/${messageId}/delete`, {});
}

export async function adminLogin(username: string, password: string): Promise<AdminUser> {
  const res = await fetch(`${API_BASE}/admin/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  const body = (await res.json()) as { user: AdminUser };
  return body.user;
}

export function logout() {
  return fetch(`${API_BASE}/admin/logout`, {
    method: "POST",
    credentials: "include",
  });
}
