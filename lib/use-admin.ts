"use client";

import { useEffect, useState } from "react";
import { fetchMe, type AdminUser } from "./api";

export type AdminAuthState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "not_admin"; user: AdminUser }
  | { status: "ready"; user: AdminUser };

export function useAdminAuth(): AdminAuthState {
  const [state, setState] = useState<AdminAuthState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetchMe()
      .then((user) => {
        if (cancelled) return;
        if (!user) return setState({ status: "anonymous" });
        if (!user.is_admin) return setState({ status: "not_admin", user });
        setState({ status: "ready", user });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "anonymous" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
