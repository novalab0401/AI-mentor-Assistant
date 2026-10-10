"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BackLink from "@/components/back-link";
import AiPanel, { type HumanStat } from "@/components/ai-panel";
import { supabase } from "@/lib/supabase";
import { getTemplate, scoredOf } from "@/lib/rubric";

type Session = {
  session_no: number; mentor_name: string; major: string | null; session_date: string;
  rubric_type: string; group_id: string; presenter_id: string | null; ai_open: boolean;
};

// AI 평가 전용 화면 — 사람 평가와 독립적이에요.
// 관리하는 사람(운영진·팀장)과 평가받는 본인이 전사문을 올리고 AI 평가를 돌릴 수 있어요.
export default function AiView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [human, setHuman] = useState<Record<string, HumanStat>>({});
  const [canManage, setCanManage] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase
      .from("sessions")
      .select("session_no, mentor_name, major, session_date, rubric_type, group_id, presenter_id, ai_open")
      .eq("id", sessionId)
      .single()
      .then(({ data }) => setSession(data ?? null));

    supabase.rpc("can_manage_session", { sid: sessionId }).then(({ data }) => setCanManage(data === true));

    // 사람 평가 점수는 관리하는 사람만 읽을 수 있어요 (본인에게는 빈 목록)
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

  async function toggleAiOpen() {
    if (!session) return;
    setBusy(true);
    const next = !session.ai_open;
    const { data, error } = await supabase
      .from("sessions").update({ ai_open: next }).eq("id", sessionId).select("id");
    setBusy(false);
    if (error) return alert("변경 실패: " + error.message);
    if ((data ?? []).length === 0) return alert("권한이 없어요.");
    setSession({ ...session, ai_open: next });
  }

  if (session === undefined) return <main className="p-4">불러오는 중...</main>;
  if (session === null) return <main className="p-4">이 수업을 볼 권한이 없거나 존재하지 않아요.</main>;

  const template = getTemplate(session.rubric_type);

  return (
    <main className="mx-auto max-w-md space-y-4 p-4">
      <BackLink href={canManage ? `/sessions/${sessionId}` : "/"} label={canManage ? "수업 화면" : "홈"} />
      <div>
        <p className="text-sm text-muted-foreground">
          시연 #{session.session_no} · {session.session_date} · {template.name}
        </p>
        <h1 className="text-xl font-bold">
          AI 평가 · {session.mentor_name}
          {session.major && <span className="font-normal"> · {session.major}</span>}
        </h1>
      </div>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>{session.mentor_name} 님에게 AI 결과 공유</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              {session.ai_open
                ? "공개 중이에요. 본인의 “내가 받은 평가”와 피드백 링크에서 가장 최근 AI 결과를 볼 수 있어요."
                : "비공개예요. 사람 평가 공개와는 따로 켜고 끌 수 있어요."}
            </p>
            <Button className="w-full" variant={session.ai_open ? "outline" : "default"}
              disabled={busy} onClick={toggleAiOpen}>
              {session.ai_open ? "AI 결과 비공개로 바꾸기" : "멘토에게 AI 결과 공개"}
            </Button>
          </CardContent>
        </Card>
      )}

      {!canManage && (
        <p className="rounded-md bg-muted p-3 text-sm">
          내 수업의 전사문을 올리고 AI 평가로 혼자 연습할 수 있어요. 내가 돌린 결과는 나만 볼 수 있고, 운영진도 볼 수 있어요.
        </p>
      )}

      <AiPanel
        sessionId={sessionId}
        template={template}
        presenter={session.mentor_name}
        topic={session.major}
        human={human}
      />
      <p className="text-xs text-muted-foreground">평가 항목 {scoredOf(template.items).length}개</p>
    </main>
  );
}
