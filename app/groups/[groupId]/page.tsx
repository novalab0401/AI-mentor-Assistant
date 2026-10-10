import { Suspense } from "react";
import GroupHome from "./group-home";

export default function Page() {
  return (
    <Suspense fallback={<main className="p-4">불러오는 중...</main>}>
      <GroupHome />
    </Suspense>
  );
}
