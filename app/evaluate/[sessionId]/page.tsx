import { Suspense } from "react";
import EvaluateForm from "./evaluate-form";

// 주소의 [sessionId]는 접속할 때만 알 수 있어서,
// 그 값을 읽는 화면을 Suspense로 감싸 "불러오는 중"을 먼저 보여 줘요.
export default function Page() {
  return (
    <Suspense fallback={<main className="p-4">불러오는 중...</main>}>
      <EvaluateForm />
    </Suspense>
  );
}
