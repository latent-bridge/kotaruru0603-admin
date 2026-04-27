"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAdminAuth } from "@/lib/use-admin";
import { adminLogin, logout } from "@/lib/api";

const NAV = [
  { href: "/schedule/", label: "スケジュール" },
  { href: "/chat/", label: "チャット" },
  { href: "/live/", label: "ライブ配信" },
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

  if (auth.status === "not_admin") {
    return (
      <CenterMessage>
        <p>このアカウントには管理者権限がありません。</p>
        <p style={{ color: "#666", fontSize: 12 }}>
          ログイン中: {auth.user.display_name || "(未設定)"} #{auth.user.tag}
        </p>
        <button
          onClick={async () => {
            await logout();
            window.location.reload();
          }}
          style={{
            marginTop: 16,
            padding: "8px 14px",
            background: "#fff",
            border: "1px solid #d2d2d7",
            borderRadius: 6,
          }}
        >
          ログアウト
        </button>
      </CenterMessage>
    );
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <header
        style={{
          background: "#fff",
          borderBottom: "1px solid #e5e5e7",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          height: 56,
          gap: 24,
        }}
      >
        <strong style={{ fontSize: 15 }}>kotaruru0603 admin</strong>
        <nav style={{ display: "flex", gap: 4, flex: 1 }}>
          {NAV.map((n) => {
            const active = pathname?.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                style={{
                  padding: "8px 14px",
                  borderRadius: 6,
                  color: active ? "#0066cc" : "#1d1d1f",
                  background: active ? "#0066cc15" : "transparent",
                  fontWeight: active ? 600 : 400,
                }}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "#666", fontSize: 12 }}>
            {auth.user.display_name || "(無名)"} #{auth.user.tag}
          </span>
          <button
            onClick={async () => {
              await logout();
              window.location.reload();
            }}
            style={{
              padding: "6px 12px",
              background: "#fff",
              border: "1px solid #d2d2d7",
              borderRadius: 6,
              fontSize: 12,
            }}
          >
            ログアウト
          </button>
        </div>
      </header>
      <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
        {children}
      </main>
    </div>
  );
}

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
      // Cookie is set; reload re-runs useAdminAuth which now sees the session.
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
        gap: 12,
        background: "#fff",
        border: "1px solid #e5e5e7",
        borderRadius: 10,
        padding: 24,
        minWidth: 320,
        textAlign: "left",
      }}
    >
      <h1 style={{ fontSize: 18, margin: 0, textAlign: "center" }}>管理画面ログイン</h1>
      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
        ユーザー名
        <input
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
        パスワード
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      {error && (
        <div style={{ fontSize: 12, color: "#cc0000" }}>{error}</div>
      )}
      <button
        type="submit"
        disabled={busy}
        style={{
          padding: "10px 18px",
          background: busy ? "#999" : "#0066cc",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          fontWeight: 600,
        }}
      >
        {busy ? "ログイン中…" : "ログイン"}
      </button>
    </form>
  );
}
