import { Suspense } from "react";
import PracticeForm from "./practice-form";

export default function Page() {
  return (
    <Suspense fallback={<main className="p-4">불러오는 중...</main>}>
      <PracticeForm />
    </Suspense>
  );
}
