"use client";

import { useEffect, useState } from "react";
import { fetchAdminMe, type AdminUser } from "./api";

export type AdminAuthState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "ready"; user: AdminUser };

export function useAdminAuth(): AdminAuthState {
  const [state, setState] = useState<AdminAuthState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetchAdminMe()
      .then((user) => {
        if (cancelled) return;
        if (!user) return setState({ status: "anonymous" });
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
