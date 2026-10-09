import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-md space-y-4 p-4">
      <h1 className="text-2xl font-bold">Nova Lab 멘토 평가</h1>
      <Link href="/sessions"
        className="block rounded-md bg-primary py-3 text-center font-medium text-primary-foreground">
        시연 목록 보기
      </Link>
      <Link href="/sessions/new"
        className="block rounded-md border py-3 text-center font-medium">
        평가받을 시연 등록
      </Link>
    </main>
  );
}