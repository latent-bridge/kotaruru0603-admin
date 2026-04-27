"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAdminAuth } from "@/lib/use-admin";
import { adminLogin, logout } from "@/lib/api";
import { PALETTE, RADIUS } from "@/lib/design";

const NAV = [
  { href: "/live/", label: "ライブ配信" },
  { href: "/schedule/", label: "スケジュール" },
  { href: "/archive/", label: "アーカイブ" },
  { href: "/chat/", label: "チャット" },
  { href: "/stamps/", label: "スタンプ" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const auth = useAdminAuth();
  const pathname = usePathname();

  if (auth.status === "loading") {
    return <CenterMessage>読み込み中…</CenterMessage>;
  }

  if (auth.status === "anonymous") {
    return (
      <CenterMessage>
        <LoginForm />
      </CenterMessage>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: PALETTE.bg }}>
      <header
        className="admin-header"
        style={{
          background: PALETTE.paper,
          borderBottom: `1px solid ${PALETTE.inkSoft}`,
        }}
      >
        <div className="admin-header-top">
          <strong style={{ fontSize: 14, color: PALETTE.inkDim, letterSpacing: 0.5 }}>
            管理者用ページ
          </strong>
          <button
            onClick={async () => {
              await logout();
              window.location.reload();
            }}
            style={{ ...secondaryBtn, padding: "6px 12px", fontSize: 12 }}
          >
            ログアウト
          </button>
        </div>
        <nav className="admin-header-nav">
          {NAV.map((n) => {
            const active = pathname?.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                style={{
                  padding: "8px 16px",
                  borderRadius: RADIUS.md,
                  color: active ? PALETTE.accent : PALETTE.ink,
                  background: active ? "#fff" : "transparent",
                  fontWeight: active ? 700 : 500,
                  border: active ? `1.5px solid ${PALETTE.coral}` : "1.5px solid transparent",
                  whiteSpace: "nowrap",
                }}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main style={{ padding: "24px 24px 60px", maxWidth: 1100, margin: "0 auto" }}>
        {children}
      </main>
    </div>
  );
}

const secondaryBtn: React.CSSProperties = {
  padding: "8px 14px",
  background: PALETTE.paper,
  border: `1.5px solid ${PALETTE.inkBorder}`,
  borderRadius: RADIUS.md,
  color: PALETTE.ink,
};

function CenterMessage({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        textAlign: "center",
        padding: 24,
        gap: 8,
      }}
    >
      {children}
    </div>
  );
}

function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await adminLogin(username, password);
      window.location.reload();
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === "invalid_credentials") {
        setError("ユーザー名またはパスワードが違います。");
      } else if (msg === "too_many_attempts") {
        setError("試行回数が上限に達しました。10 分後にやり直してください。");
      } else if (msg === "admin_login_not_configured") {
        setError("サーバーで管理者認証が未設定です。");
      } else {
        setError(`ログイン失敗: ${msg}`);
      }
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        background: PALETTE.paper,
        border: `1.5px solid ${PALETTE.inkSoft}`,
        borderRadius: RADIUS.lg,
        padding: 28,
        minWidth: 340,
        textAlign: "left",
      }}
    >
      <h1 style={{ fontSize: 20, margin: 0, textAlign: "center", color: PALETTE.ink }}>
        管理画面ログイン
      </h1>
      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: PALETTE.inkDim }}>
        ユーザー名
        <input type="text" autoComplete="username" value={username}
          onChange={(e) => setUsername(e.target.value)} required />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: PALETTE.inkDim }}>
        パスワード
        <input type="password" autoComplete="current-password" value={password}
          onChange={(e) => setPassword(e.target.value)} required />
      </label>
      {error && (
        <div style={{ fontSize: 12, color: PALETTE.accent }}>{error}</div>
      )}
      <button type="submit" disabled={busy} style={{
        padding: "12px 20px",
        background: busy ? PALETTE.inkDim : PALETTE.accent,
        color: "#fff",
        border: "none",
        borderRadius: RADIUS.md,
        fontWeight: 700,
      }}>
        {busy ? "ログイン中…" : "ログイン"}
      </button>
    </form>
  );
}
