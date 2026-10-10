"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import BackLink from "@/components/back-link";
import AiPanel, { type HumanStat } from "@/components/ai-panel";
import { supabase } from "@/lib/supabase";
import { getTemplate, scoredOf } from "@/lib/rubric";

type Session = {
  session_no: number; mentor_name: string; major: string | null; session_date: string;
  rubric_type: string; group_id: string;
};

// AI 평가 전용 화면 — 사람 평가와 독립적이에요.
// 사람 평가가 있으면 비교도 함께 보여 줘요.
export default function AiView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [human, setHuman] = useState<Record<string, HumanStat>>({});

  useEffect(() => {
    supabase
      .from("sessions")
      .select("session_no, mentor_name, major, session_date, rubric_type, group_id")
      .eq("id", sessionId)
      .single()
      .then(({ data }) => setSession(data ?? null));

    supabase
      .from("evaluations")
      .select("item_id, score")
      .eq("session_id", sessionId)
      .then(({ data }) => {
        const by: Record<string, number[]> = {};
        for (const e of (data ?? []) as { item_id: string; score: number | null }[]) {
          if (e.score !== null) (by[e.item_id] ??= []).push(e.score);
        }
        setHuman(
          Object.fromEntries(
            Object.entries(by).map(([id, s]) => [id, { avg: s.reduce((a, b) => a + b, 0) / s.length, n: s.length }])
          )
        );
      });
  }, [sessionId]);

  if (session === undefined) return <main className="p-4">불러오는 중...</main>;
  if (session === null) return <main className="p-4">이 수업을 볼 권한이 없거나 존재하지 않아요.</main>;

  const template = getTemplate(session.rubric_type);

  return (
    <main className="mx-auto max-w-md space-y-4 p-4">
      <BackLink href={`/sessions/${sessionId}`} label="수업 화면" />
      <div>
        <p className="text-sm text-muted-foreground">
          시연 #{session.session_no} · {session.session_date} · {template.name}
        </p>
        <h1 className="text-xl font-bold">
          AI 평가 · {session.mentor_name}
          {session.major && <span className="font-normal"> · {session.major}</span>}
        </h1>
      </div>
      <AiPanel
        sessionId={sessionId}
        template={template}
        presenter={session.mentor_name}
        topic={session.major}
        human={human}
      />
      <p className="text-xs text-muted-foreground">
        평가 항목 {scoredOf(template.items).length}개 · AI 결과는 운영진·팀장만 볼 수 있어요.
      </p>
    </main>
  );
}
