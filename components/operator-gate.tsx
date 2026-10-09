"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useOperator } from "@/lib/use-operator";

// 운영자만 볼 수 있는 화면을 감싸요. 로그인 안 했으면 로그인 화면으로 보내요.
// 주의: 이건 "화면"을 숨기는 것뿐이에요. 진짜 잠금은 Supabase 보안 규칙(RLS)이 해요.
export default function OperatorGate({ children }: { children: React.ReactNode }) {
  const user = useOperator();
  const router = useRouter();

  useEffect(() => {
    if (user === null) router.replace("/login");
  }, [user, router]);

  if (!user) return <main className="p-4">확인 중...</main>;

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <>
      <div className="mx-auto flex max-w-md items-center justify-between px-4 pt-3 text-xs text-muted-foreground">
        <span>운영자 · {user.email}</span>
        <button onClick={logout} className="underline underline-offset-2">
          로그아웃
        </button>
      </div>
      {children}
    </>
  );
}
