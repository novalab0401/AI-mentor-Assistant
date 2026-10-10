"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import BackLink from "@/components/back-link";
import RubricForm from "@/components/rubric-form";
import AiPanel, { type HumanStat } from "@/components/ai-panel";
import { supabase } from "@/lib/supabase";
import {
  getTemplate, groupsOf, isComplete, scoredOf, textOf, toRows, type Answers,
} from "@/lib/rubric";

type Session = {
  session_no: number; mentor_name: string; major: string | null; session_date: string; rubric_type: string;
  feedback_token: string; feedback_open: boolean; group_id: string; presenter_id: string | null;
};
type Evaluation = {
  id: number; evaluator_name: string; item_id: string; score: number | null; memo: string | null;
};

// 수정 중인 평가자의 임시 값
type Draft = { originalName: string; name: string; answers: Answers };

export default function SessionDetail() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [reloadKey, setReloadKey] = useState(0); // 값이 바뀌면 데이터를 다시 불러와요
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedFeedback, setCopiedFeedback] = useState(false);

  useEffect(() => {
    supabase
      .from("sessions")
      .select("session_no, mentor_name, major, session_date, rubric_type, feedback_token, feedback_open, group_id, presenter_id")
      .eq("id", sessionId)
      .single()
      .then(({ data }) => setSession(data ?? null));
  }, [sessionId]);

  useEffect(() => {
    supabase
      .from("evaluations")
      .select("id, evaluator_name, item_id, score, memo")
      .eq("session_id", sessionId)
      .order("created_at")
      .then(({ data }) => setEvals(data ?? []));
  }, [sessionId, reloadKey]);

  if (session === undefined) return <main className="p-4">불러오는 중...</main>;
  if (session === null) return <main className="p-4">존재하지 않는 시연이에요.</main>;

  const template = getTemplate(session.rubric_type);
  const items = template.items;
  const scoredItems = scoredOf(items);
  const textItems = textOf(items);
  const groups = groupsOf(items);
  const evaluators = [...new Set(evals.map((e) => e.evaluator_name))];
  const rowsOf = (name: string) => evals.filter((e) => e.evaluator_name === name);

  // 항목별 평균: "판단하기 어려움"(null)은 0점이 아니라 평균에서 빼요
  function stats(itemId: string) {
    const s = evals
      .filter((e) => e.item_id === itemId && e.score !== null)
      .map((e) => e.score as number);
    if (s.length === 0) return { avg: "-", n: 0 };
    return { avg: (s.reduce((a, b) => a + b, 0) / s.length).toFixed(1), n: s.length };
  }

  // 멘토에게 결과 공개/비공개
  async function toggleFeedback() {
    if (!session) return;
    const next = !session.feedback_open;
    setBusy(true);
    const { data, error } = await supabase
      .from("sessions")
      .update({ feedback_open: next })
      .eq("id", sessionId)
      .select("id");
    setBusy(false);
    if (error) return alert("변경 실패: " + error.message);
    if ((data ?? []).length === 0) return alert("권한이 없어요. 운영자로 로그인했는지 확인해 주세요.");
    setSession({ ...session, feedback_open: next });
  }

  function copyFeedbackLink() {
    if (!session) return;
    navigator.clipboard.writeText(`${window.location.origin}/feedback/${session.feedback_token}`);
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 1500);
  }

  function startEdit(name: string) {
    const answers: Answers = { scores: {}, memos: {} };
    for (const r of rowsOf(name)) {
      const item = items.find((i) => i.id === r.item_id);
      if (item?.kind === "score") answers.scores[r.item_id] = r.score;
      if (r.memo) answers.memos[r.item_id] = r.memo;
    }
    setDraft({ originalName: name, name, answers });
  }

  async function saveEdit() {
    if (!draft || draft.name.trim() === "") return;
    setBusy(true);
    const existing = rowsOf(draft.originalName);
    const wanted = toRows(items, draft.answers);

    const ops = [
      // 있던 항목은 수정, 새로 생긴 항목은 추가
      ...wanted.map((w) => {
        const row = existing.find((r) => r.item_id === w.item_id);
        const values = { ...w, evaluator_name: draft.name.trim() };
        return row
          ? supabase.from("evaluations").update(values).eq("id", row.id).select("id")
          : supabase.from("evaluations").insert({ ...values, session_id: sessionId }).select("id");
      }),
      // 지운 서술형 의견은 내용만 비우기 (줄은 남겨요)
      ...existing
        .filter((r) => !wanted.some((w) => w.item_id === r.item_id) && r.memo !== null)
        .map((r) =>
          supabase.from("evaluations")
            .update({ memo: null, evaluator_name: draft.name.trim() })
            .eq("id", r.id).select("id")
        ),
    ];

    const results = await Promise.all(ops);
    setBusy(false);

    const failed = results.find((r) => r.error);
    if (failed?.error) return alert("수정 실패: " + failed.error.message);
    // 보안 규칙에 막히면 에러 없이 0줄만 바뀌어요. 그래서 따로 확인해요.
    if (results.some((r) => (r.data ?? []).length === 0))
      return alert("수정 권한이 없어요. 운영자로 로그인했는지 확인해 주세요.");

    setDraft(null);
    setReloadKey((k) => k + 1);
  }

  async function remove(name: string) {
    if (!confirm(`${name} 님의 평가를 삭제할까요?`)) return;
    setBusy(true);
    // 보관 삭제: 결과에서는 빠지고, 기록은 Nova Lab DB에 남아요
    const { data, error } = await supabase.rpc("archive_evaluator", {
      p_session: sessionId,
      p_evaluator: name,
    });
    setBusy(false);

    if (error) return alert("삭제 실패: " + error.message);
    if (!data) return alert("삭제된 평가가 없어요. 권한을 확인해 주세요.");
    setReloadKey((k) => k + 1);
  }

  return (
    <main className="mx-auto max-w-md space-y-4 p-4">
      <BackLink href={`/groups/${session.group_id}`} label="그룹" />

      <div>
        <p className="text-sm text-muted-foreground">
          시연 #{session.session_no} · {session.session_date}
        </p>
        <h1 className="text-xl font-bold">
          {session.mentor_name}
          {session.major && <span className="font-normal"> · {session.major}</span>}
        </h1>
        <p className="text-sm text-muted-foreground">발표 멘토 (평가받는 사람) · 평가지: {template.name}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          onClick={() => {
            navigator.clipboard.writeText(`${window.location.origin}/evaluate/${sessionId}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "복사됨!" : "평가 링크 복사"}
        </Button>
        <Link href={`/evaluate/${sessionId}`}
          className="flex items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground">
          직접 평가하기
        </Link>
      </div>

      {/* ── 멘토에게 결과 공유 ── */}
      <Card>
        <CardHeader>
          <CardTitle>{session.mentor_name} 님에게 결과 공유</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            {session.feedback_open
              ? session.presenter_id
                ? "공개 중이에요. 본인이 로그인하면 홈 화면 \"내가 받은 평가\"에서 바로 볼 수 있어요. 평가자 이름은 보이지 않아요."
                : "공개 중이에요. 피드백 링크로 점수와 의견을 볼 수 있어요. 평가자 이름은 보이지 않아요."
              : session.presenter_id
                ? "비공개예요. 공개하면 본인 홈 화면의 \"내가 받은 평가\"에 바로 나타나요."
                : "비공개예요. 링크를 미리 보내도 공개하기 전에는 \"아직 공개 전\"으로 보여요."}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant={session.feedback_open ? "outline" : "default"} disabled={busy}
              onClick={toggleFeedback}>
              {session.feedback_open ? "비공개로 바꾸기" : "멘토에게 공개"}
            </Button>
            <Button variant="outline" onClick={copyFeedbackLink}>
              {copiedFeedback ? "복사됨!" : "피드백 링크 복사"}
            </Button>
          </div>
          <a href={`/feedback/${session.feedback_token}`} target="_blank"
            className="block text-center text-xs text-muted-foreground underline underline-offset-2">
            멘토가 보는 화면 미리 보기
          </a>
        </CardContent>
      </Card>

      {/* ── 항목별 평균 ── */}
      <Card>
        <CardHeader>
          <CardTitle>항목별 평균 (평가자 {evaluators.length}명)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {groups
            .filter((g) => scoredItems.some((i) => i.group === g))
            .map((g) => (
              <div key={g} className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground">{g}</p>
                {scoredItems
                  .filter((i) => i.group === g)
                  .map((item) => {
                    const { avg, n } = stats(item.id);
                    return (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.title}</span>
                        <span>
                          <b>{avg}</b>
                          {n > 0 && n < evaluators.length && (
                            <span className="text-xs text-muted-foreground"> ({n}명)</span>
                          )}
                        </span>
                      </div>
                    );
                  })}
              </div>
            ))}
        </CardContent>
      </Card>

      {/* ── AI 채점 (이 화면은 관리하는 사람만 들어와요) ── */}
      <AiPanel
        sessionId={sessionId}
        template={template}
        presenter={session.mentor_name}
        topic={session.major}
        human={Object.fromEntries(
          scoredItems.map((i): [string, HumanStat] => {
            const st = stats(i.id);
            return [i.id, { avg: st.n > 0 ? Number(st.avg) : null, n: st.n }];
          })
        )}
      />

      {evaluators.length === 0 && (
        <p className="text-sm text-muted-foreground">아직 평가가 없어요.</p>
      )}

      {/* ── 평가자별 ── */}
      {evaluators.map((name) =>
        draft?.originalName === name ? (
          // 수정 모드
          <Card key={name}>
            <CardHeader>
              <CardTitle>평가 수정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="평가자 이름"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
              <RubricForm
                items={items}
                value={draft.answers}
                onChange={(answers) => setDraft({ ...draft, answers })}
              />
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setDraft(null)} disabled={busy}>
                  취소
                </Button>
                <Button
                  onClick={saveEdit}
                  disabled={busy || draft.name.trim() === "" || !isComplete(items, draft.answers)}
                >
                  {busy ? "저장 중..." : isComplete(items, draft.answers) ? "저장" : "빈 항목이 있어요"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          // 보기 모드
          <Card key={name}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{name}</CardTitle>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" disabled={busy || draft !== null}
                    onClick={() => startEdit(name)}>
                    수정
                  </Button>
                  <Button size="sm" variant="destructive" disabled={busy || draft !== null}
                    onClick={() => remove(name)}>
                    삭제
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {scoredItems.map((item) => {
                const r = rowsOf(name).find((e) => e.item_id === item.id);
                if (!r) return null; // 항목이 추가되기 전에 제출된 평가
                return (
                  <div key={item.id} className="text-sm">
                    <div className="flex justify-between">
                      <span>{item.title}</span>
                      <span className="font-semibold">
                        {r.score === null ? "판단 어려움" : `${r.score}점`}
                      </span>
                    </div>
                    {r.memo && <p className="text-muted-foreground">{r.memo}</p>}
                  </div>
                );
              })}

              {textItems.map((item) => {
                const r = rowsOf(name).find((e) => e.item_id === item.id);
                if (!r?.memo) return null;
                return (
                  <div key={item.id} className="rounded-md bg-muted px-3 py-2 text-sm">
                    <p className="font-medium">{item.title}</p>
                    <p className="whitespace-pre-wrap text-muted-foreground">{r.memo}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )
      )}
    </main>
  );
}
