import { Suspense } from "react";
import SessionDetail from "./session-detail";

export default function Page() {
  return (
    <Suspense fallback={<main className="p-4">불러오는 중...</main>}>
      <SessionDetail />
    </Suspense>
  );
}
