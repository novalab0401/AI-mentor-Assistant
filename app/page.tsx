"use client";

import Link from "next/link";
import { useOperator } from "@/lib/use-operator";

export default function Home() {
  const user = useOperator();

  return (
    <main className="mx-auto max-w-md space-y-4 p-4 pt-16">
      <h1 className="text-2xl font-bold">Nova Lab 멘토 평가</h1>

      {user === undefined && <p className="text-sm text-muted-foreground">확인 중...</p>}

      {user === null && (
        <>
          <p className="text-sm text-muted-foreground">
            시연을 평가하러 오셨다면, 운영자에게 받은 <b>평가 링크</b>로 접속해 주세요.
          </p>
          <Link href="/login" className="block rounded-md border py-3 text-center font-medium">
            운영자 로그인
          </Link>
        </>
      )}

      {user && (
        <>
          <Link href="/sessions"
            className="block rounded-md bg-primary py-3 text-center font-medium text-primary-foreground">
            시연 목록 보기
          </Link>
          <Link href="/sessions/new" className="block rounded-md border py-3 text-center font-medium">
            평가받을 시연 등록
          </Link>
        </>
      )}
    </main>
  );
}
