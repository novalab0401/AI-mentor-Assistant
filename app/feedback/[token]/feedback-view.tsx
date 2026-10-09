"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { getTemplate, groupsOf, scoredOf, textOf } from "@/lib/rubric";

type Row = { evaluator: number; item_id: string; score: number | null; memo: string | null };
type Feedback =
  | { open: false; mentor_name: string }
  | {
      open: true;
      session_no: number;
      mentor_name: string;
      major: string | null;
      session_date: string;
      rubric_type: string;
      evaluations: Row[];
    };

export default function FeedbackView() {
  const { token } = useParams<{ token: string }>();
  // undefined = 불러오는 중, null = 없는 링크
  const [data, setData] = useState<Feedback | null | undefined>(undefined);

  useEffect(() => {
    supabase
      .rpc("get_feedback", { p_token: token })
      .then(({ data }) => setData((data as Feedback | null) ?? null));
  }, [token]);

  if (data === undefined) return <main className="p-4">불러오는 중...</main>;
  if (data === null)
    return <main className="p-4">존재하지 않는 피드백 링크예요. 링크를 다시 확인해 주세요.</main>;

  if (!data.open) {
    return (
      <main className="mx-auto max-w-md space-y-2 p-4 pt-16 text-center">
        <h1 className="text-xl font-bold">{data.mentor_name} 님의 피드백</h1>
        <p className="text-sm text-muted-foreground">
          아직 공개 전이에요. 평가가 모두 끝나면 운영진이 공개할 거예요.
        </p>
      </main>
    );
  }

  const template = getTemplate(data.rubric_type);
  const items = template.items;
  const evals = data.evaluations;
  const evaluatorCount = new Set(evals.map((e) => e.evaluator)).size;

  function stats(itemId: string) {
    const s = evals.filter((e) => e.item_id === itemId && e.score !== null).map((e) => e.score as number);
    if (s.length === 0) return null;
    return s.reduce((a, b) => a + b, 0) / s.length;
  }
  const memosOf = (itemId: string) => evals.filter((e) => e.item_id === itemId && e.memo);

  return (
    <main className="mx-auto max-w-md space-y-5 p-4 pb-12">
      <div>
        <p className="text-sm text-muted-foreground">
          시연 #{data.session_no} · {data.session_date} · {template.name}
        </p>
        <h1 className="text-xl font-bold">
          {data.mentor_name} 님의 피드백
          {data.major && <span className="font-normal"> · {data.major}</span>}
        </h1>
        <p className="text-sm text-muted-foreground">
          평가자 {evaluatorCount}명 · 평가자 이름은 공개되지 않아요
        </p>
      </div>

      {evaluatorCount === 0 && (
        <p className="text-sm text-muted-foreground">아직 들어온 평가가 없어요.</p>
      )}

      {/* ── 점수 항목 ── */}
      {groupsOf(scoredOf(items)).map((group) => (
        <section key={group} className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">{group}</h2>
          {scoredOf(items)
            .filter((i) => i.group === group)
            .map((item) => {
              const avg = stats(item.id);
              const level = avg === null ? null : Math.min(4, Math.max(1, Math.round(avg)));
              const next = level !== null && level < 4 ? level + 1 : null;
              return (
                <Card key={item.id}>
                  <CardHeader>
                    <div className="flex items-baseline justify-between gap-2">
                      <CardTitle>{item.title}</CardTitle>
                      <span className="shrink-0 text-lg font-bold">
                        {avg === null ? "-" : avg.toFixed(1)}
                        <span className="text-xs font-normal text-muted-foreground"> / 4</span>
                      </span>
                    </div>
                    <CardDescription>{item.question}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {level !== null && (
                      <p className="rounded-md bg-muted px-3 py-2">
                        <b>지금 ({level}점 수준):</b> {item.levels[level - 1]}
                      </p>
                    )}
                    {/* 성장에 쓰이도록 "다음 단계"가 어떤 모습인지 보여 줘요 */}
                    {next !== null && (
                      <p className="rounded-md border border-primary/40 px-3 py-2">
                        <b>다음 목표 ({next}점):</b> {item.levels[next - 1]}
                      </p>
                    )}
                    {memosOf(item.id).map((m, i) => (
                      <p key={i} className="text-muted-foreground">
                        <span className="text-xs">평가자 {m.evaluator}</span> · {m.memo}
                      </p>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
        </section>
      ))}

      {/* ── 서술형 의견 ── */}
      {textOf(items).some((t) => memosOf(t.id).length > 0) && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">종합 의견</h2>
          {textOf(items)
            .filter((t) => memosOf(t.id).length > 0)
            .map((t) => (
              <Card key={t.id}>
                <CardHeader>
                  <CardTitle>{t.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {memosOf(t.id).map((m, i) => (
                    <p key={i} className="whitespace-pre-wrap">
                      <span className="text-xs text-muted-foreground">평가자 {m.evaluator}</span>
                      <br />
                      {m.memo}
                    </p>
                  ))}
                </CardContent>
              </Card>
            ))}
        </section>
      )}
    </main>
  );
}
