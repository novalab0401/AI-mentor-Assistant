"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BackLink from "@/components/back-link";
import PasswordInput from "@/components/password-input";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); // 폼 제출 시 페이지가 새로고침되는 기본 동작 막기
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);

    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "이메일 또는 비밀번호가 맞지 않아요."
          : "로그인 실패: " + error.message
      );
      return;
    }
    router.replace("/");
  }

  return (
    <main className="mx-auto max-w-md space-y-4 p-4 pt-6">
      <BackLink href="/" label="홈" />
      <div>
        <h1 className="text-xl font-bold">로그인</h1>
        <p className="text-sm text-muted-foreground">
          그룹에 가입해 시연을 하고, 평가하고, 피드백을 받아요.
        </p>
      </div>
      <form onSubmit={handleLogin} className="space-y-3">
        <Input type="email" placeholder="이메일" autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <PasswordInput placeholder="비밀번호" autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy || !email || !password}>
          {busy ? "확인 중..." : "로그인"}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        계정이 없나요? <Link href="/signup" className="underline">회원가입</Link>
      </p>
    </main>
  );
}
