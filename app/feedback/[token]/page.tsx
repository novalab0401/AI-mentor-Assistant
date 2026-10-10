import { Suspense } from "react";
import FeedbackView from "./feedback-view";

export default function Page() {
  return (
    <Suspense fallback={<main className="p-4">불러오는 중...</main>}>
      <FeedbackView />
    </Suspense>
  );
}
