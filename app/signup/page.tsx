"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BackLink from "@/components/back-link";
import PasswordInput from "@/components/password-input";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const mismatch = password2 !== "" && password !== password2;
  const canSubmit =
    name.trim() !== "" && email.trim() !== "" && password.length >= 6 && password === password2 && !busy;

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      // 이름은 가입할 때 같이 보내고, DB가 프로필을 자동으로 만들어요
      options: { data: { display_name: name.trim() } },
    });
    setBusy(false);

    if (error) {
      setError(
        error.message.includes("already registered")
          ? "이미 가입된 이메일이에요. 로그인해 주세요."
          : error.message.includes("Signups not allowed")
            ? "지금은 회원가입이 꺼져 있어요. 운영자에게 문의해 주세요."
            : "가입 실패: " + error.message
      );
      return;
    }
    if (data.session) {
      router.replace("/");
    } else {
      // 이메일 인증이 켜져 있으면 세션 없이 끝나요
      setNotice("가입 확인 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해 주세요.");
    }
  }

  return (
    <main className="mx-auto max-w-md space-y-4 p-4 pt-6">
      <BackLink href="/" label="홈" />
      <h1 className="text-xl font-bold">회원가입</h1>
      {notice ? (
        <p className="rounded-md bg-muted p-3 text-sm">{notice}</p>
      ) : (
        <form onSubmit={handleSignup} className="space-y-3">
          <Input placeholder="이름 (그룹에서 보이는 이름)" value={name}
            onChange={(e) => setName(e.target.value)} />
          <Input type="email" placeholder="이메일" autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)} />
          <PasswordInput placeholder="비밀번호 (6자 이상)" autoComplete="new-password"
            value={password} onChange={(e) => setPassword(e.target.value)} />
          <PasswordInput placeholder="비밀번호 확인 (한 번 더)" autoComplete="new-password"
            value={password2} onChange={(e) => setPassword2(e.target.value)}
            aria-invalid={mismatch} />
          {password !== "" && password.length < 6 && (
            <p className="text-xs text-muted-foreground">비밀번호는 6자 이상이어야 해요.</p>
          )}
          {mismatch && <p className="text-xs text-destructive">두 비밀번호가 달라요.</p>}
          {password2 !== "" && !mismatch && password.length >= 6 && (
            <p className="text-xs text-primary">비밀번호가 일치해요.</p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {busy ? "가입 중..." : "가입하기"}
          </Button>
        </form>
      )}
      <p className="text-center text-sm text-muted-foreground">
        이미 계정이 있나요? <Link href="/login" className="underline">로그인</Link>
      </p>
    </main>
  );
}
