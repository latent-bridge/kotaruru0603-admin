"use client";

import { Shell } from "@/components/Shell";

// Shell handles all auth states (loading / anonymous / not_admin / ready), so
// /login is just a thin wrapper that lets the user land here directly.
export default function LoginPage() {
  return <Shell><p>ログイン状態を確認しています…</p></Shell>;
}
