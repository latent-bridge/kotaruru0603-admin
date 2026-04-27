"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/live/");
  }, [router]);

  return (
    <Shell>
      <p>リダイレクト中…</p>
    </Shell>
  );
}
