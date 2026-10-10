"use client";

import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { groupsOf, type Answers, type RubricItem } from "@/lib/rubric";

// 평가 화면과 "평가 수정" 화면이 함께 쓰는 평가지
export default function RubricForm({
  items,
  value,
  onChange,
}: {
  items: RubricItem[];
  value: Answers;
  onChange: (next: Answers) => void;
}) {
  const setScore = (id: string, v: number | null) =>
    onChange({ ...value, scores: { ...value.scores, [id]: v } });
  const setMemo = (id: string, text: string) =>
    onChange({ ...value, memos: { ...value.memos, [id]: text } });

  return (
    <div className="space-y-6">
      {groupsOf(items).map((group) => (
        <section key={group} className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">{group}</h2>

          {items
            .filter((item) => item.group === group)
            .map((item) => {
              if (item.kind === "text") {
                return (
                  <div key={item.id} className="space-y-1.5">
                    <p className="text-sm font-medium">{item.title}</p>
                    <Textarea
                      placeholder={item.placeholder}
                      value={value.memos[item.id] ?? ""}
                      onChange={(e) => setMemo(item.id, e.target.value)}
                    />
                  </div>
                );
              }

              const picked = value.scores[item.id]; // undefined = 아직, null = 평가 불가
              return (
                <Card key={item.id}>
                  <CardHeader>
                    <CardTitle>{item.title}</CardTitle>
                    <CardDescription>{item.question}</CardDescription>
                    {item.anchors && item.anchors.length > 0 && (
                      <details className="text-xs text-muted-foreground">
                        <summary className="cursor-pointer">판단 기준 예시 보기</summary>
                        <ul className="mt-1 ml-4 list-disc space-y-1">
                          {item.anchors.map((a, i) => <li key={i}>{a}</li>)}
                        </ul>
                      </details>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 2, 3, 4].map((n) => (
                        <Button
                          key={n}
                          variant={picked === n ? "default" : "outline"}
                          onClick={() => setScore(item.id, n)}
                        >
                          {n}점
                        </Button>
                      ))}
                    </div>

                    {/* 고른 점수의 기준 문장을 보여 줘서, 평가자끼리 기준을 맞춰요 */}
                    {typeof picked === "number" && (
                      <p className="rounded-md bg-muted px-3 py-2 text-sm">
                        <b>{picked}점 기준:</b> {item.levels[picked - 1]}
                      </p>
                    )}

                    {item.allowNA && (
                      <Button
                        size="sm"
                        variant={picked === null ? "secondary" : "ghost"}
                        className="w-full"
                        onClick={() => setScore(item.id, null)}
                      >
                        {picked === null ? "✓ 이번 시연에서는 판단하기 어려움" : "판단하기 어려움 (평균에서 제외)"}
                      </Button>
                    )}

                    <Textarea
                      placeholder="근거가 된 장면이나 발화 (선택)"
                      value={value.memos[item.id] ?? ""}
                      onChange={(e) => setMemo(item.id, e.target.value)}
                    />
                  </CardContent>
                </Card>
              );
            })}
        </section>
      ))}
    </div>
  );
}
