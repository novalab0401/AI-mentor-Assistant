"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useOperator } from "@/lib/use-operator";

// 로그인한 사람만 볼 수 있는 화면을 감싸요. 로그인 안 했으면 로그인 화면으로 보내요.
// 주의: 이건 "화면"을 숨기는 것뿐이에요. 누가 무엇을 볼 수 있는지는 Supabase 보안 규칙(RLS)이 정해요.
export default function OperatorGate({ children }: { children: React.ReactNode }) {
  const user = useOperator();
  const router = useRouter();

  useEffect(() => {
    if (user === null) router.replace("/login");
  }, [user, router]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  // 화면 자체는 항상 그려 두고, 로그인 확인 전에는 숨겨 둬요.
  return (
    <>
      {!user && <main className="p-4">확인 중...</main>}
      <div hidden={!user}>
        {user && (
          <div className="mx-auto flex max-w-md items-center justify-between px-4 pt-3 text-xs text-muted-foreground">
            <Link href="/" className="underline underline-offset-2">내 그룹</Link>
            <span className="flex gap-3">
              <span>{user.email}</span>
              <button onClick={logout} className="underline underline-offset-2">로그아웃</button>
            </span>
          </div>
        )}
        {children}
      </div>
    </>
  );
}
