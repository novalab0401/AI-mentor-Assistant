"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { items, itemTitle } from "@/lib/rubric";

type Session = { session_no: number; mentor_name: string; major: string | null; session_date: string };
type Evaluation = { id: number; evaluator_name: string; item_id: string; score: number; memo: string | null };

// 수정 중인 평가자의 임시 값
type Draft = {
  originalName: string;
  name: string;
  scores: Record<string, number>;
  memos: Record<string, string>;
};

export default function SessionDetail() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [reloadKey, setReloadKey] = useState(0); // 값이 바뀌면 데이터를 다시 불러와요
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase
      .from("sessions")
      .select("session_no, mentor_name, major, session_date")
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

  const evaluators = [...new Set(evals.map((e) => e.evaluator_name))];
  const rowsOf = (name: string) => evals.filter((e) => e.evaluator_name === name);

  function average(itemId: string) {
    const s = evals.filter((e) => e.item_id === itemId).map((e) => e.score);
    if (s.length === 0) return "-";
    return (s.reduce((a, b) => a + b, 0) / s.length).toFixed(1);
  }

  function startEdit(name: string) {
    const rows = rowsOf(name);
    setDraft({
      originalName: name,
      name,
      scores: Object.fromEntries(rows.map((r) => [r.item_id, r.score])),
      memos: Object.fromEntries(rows.map((r) => [r.item_id, r.memo ?? ""])),
    });
  }

  async function saveEdit() {
    if (!draft || draft.name.trim() === "") return;
    setBusy(true);
    // 평가자 한 명 = 항목별 여러 줄이라, 줄마다 따로 수정해요
    const results = await Promise.all(
      rowsOf(draft.originalName).map((r) =>
        supabase
          .from("evaluations")
          .update({
            evaluator_name: draft.name.trim(),
            score: draft.scores[r.item_id],
            memo: draft.memos[r.item_id]?.trim() || null,
          })
          .eq("id", r.id)
          .select("id")
      )
    );
    setBusy(false);

    const failed = results.find((r) => r.error);
    if (failed?.error) return alert("수정 실패: " + failed.error.message);
    // 보안 규칙에 막히면 에러 없이 0줄만 바뀌어요. 그래서 따로 확인해요.
    if (results.some((r) => (r.data ?? []).length === 0))
      return alert("수정 권한이 없어요. Supabase에서 수정 허용 SQL을 실행했는지 확인해 주세요.");

    setDraft(null);
    setReloadKey((k) => k + 1);
  }

  async function remove(name: string) {
    if (!confirm(`${name} 님의 평가를 삭제할까요? 되돌릴 수 없어요.`)) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("evaluations")
      .delete()
      .in("id", rowsOf(name).map((r) => r.id))
      .select("id");
    setBusy(false);

    if (error) return alert("삭제 실패: " + error.message);
    if ((data ?? []).length === 0)
      return alert("삭제 권한이 없어요. Supabase에서 삭제 허용 SQL을 실행했는지 확인해 주세요.");
    setReloadKey((k) => k + 1);
  }

  return (
    <main className="mx-auto max-w-md space-y-4 p-4">
      <Link href="/sessions" className="text-sm text-muted-foreground">
        ← 시연 목록
      </Link>

      <div>
        <p className="text-sm text-muted-foreground">
          시연 #{session.session_no} · {session.session_date}
        </p>
        <h1 className="text-xl font-bold">
          {session.mentor_name}
          {session.major && <span className="font-normal"> · {session.major}</span>}
        </h1>
        <p className="text-sm text-muted-foreground">평가받는 멘토</p>
      </div>

      <Link href={`/evaluate/${sessionId}`}
        className="block rounded-md bg-primary py-2 text-center text-sm font-medium text-primary-foreground">
        이 시연 평가하기
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>항목별 평균 (평가자 {evaluators.length}명)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>{item.title}</span>
              <span className="font-semibold">{average(item.id)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {evaluators.length === 0 && (
        <p className="text-sm text-muted-foreground">아직 평가가 없어요.</p>
      )}

      {evaluators.map((name) =>
        draft?.originalName === name ? (
          // ── 수정 모드 ──
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
              {rowsOf(name).map((r) => (
                <div key={r.id} className="space-y-2">
                  <p className="text-sm font-medium">{itemTitle(r.item_id)}</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((n) => (
                      <Button
                        key={n}
                        variant={draft.scores[r.item_id] === n ? "default" : "outline"}
                        onClick={() =>
                          setDraft({ ...draft, scores: { ...draft.scores, [r.item_id]: n } })
                        }
                      >
                        {n}점
                      </Button>
                    ))}
                  </div>
                  <Textarea
                    placeholder="근거가 된 장면이나 발화 (선택)"
                    value={draft.memos[r.item_id] ?? ""}
                    onChange={(e) =>
                      setDraft({ ...draft, memos: { ...draft.memos, [r.item_id]: e.target.value } })
                    }
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setDraft(null)} disabled={busy}>
                  취소
                </Button>
                <Button onClick={saveEdit} disabled={busy || draft.name.trim() === ""}>
                  {busy ? "저장 중..." : "저장"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          // ── 보기 모드 ──
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
              {rowsOf(name).map((e) => (
                <div key={e.id} className="text-sm">
                  <div className="flex justify-between">
                    <span>{itemTitle(e.item_id)}</span>
                    <span className="font-semibold">{e.score}점</span>
                  </div>
                  {e.memo && <p className="text-muted-foreground">{e.memo}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        )
      )}
    </main>
  );
}
