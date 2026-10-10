"use client";

import { Textarea } from "@/components/ui/textarea";

// 수업 계획: 멘토가 설계한 순서와 시간
export const PLAN_PLACEHOLDER =
  "예)\n1. 도입·목표 (3분): 오늘 끝나면 '기계공학은 ○○ 배우는 곳'을 한 문장으로 말하기\n2. 학과에서 배우는 것 (10분): 4대 역학을 일상 예시로\n3. 진로 (8분): 졸업 후 진로, 고등학생이 지금 할 일\n4. 질문·정리 (7분): 예상 질문, 목표 문장 말해 보기";

export default function PlanField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Textarea className="min-h-32 text-sm" placeholder={PLAN_PLACEHOLDER} value={value}
        onChange={(e) => onChange(e.target.value)} />
      <p className="text-xs text-muted-foreground">
        선택이에요. 적으면 수업 전에 AI가 계획을 검토해 주고, 수업 후에는 계획대로 진행했는지도 함께 봐요.
      </p>
    </div>
  );
}
