"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { scoredOf, type ScoredItem, type Template } from "@/lib/rubric";
import { PROMPT_VERSION, buildManualPrompt, parseAiOutput, verifyQuote } from "@/lib/ai-scoring";
import { findMajor, majorPromptText } from "@/lib/majors";
import { materialPromptText, type MaterialRow } from "@/lib/materials";

type Transcript = {
  id: number; content: string; source: string; created_at: string;
  planned_minutes: number | null; actual_minutes: number | null;
};
type Run = {
  id: number; created_at: string; model: string; prompt_version: string;
  summary: { strengths: string[]; improvements: string[] } | null;
  usage: { input_tokens?: number; output_tokens?: number } | null;
};
type AiScore = {
  item_id: string; score: number | null;
  evidence: { quote: string; verified: boolean }[];
  rationale: string | null; next_action: string | null;
};
export type HumanStat = { avg: number | null; n: number };

// 결과 화면의 AI 채점 영역 (운영진·팀장만 보여요)
export default function AiPanel({
  sessionId, template, presenter, topic, audience, sceneLabel, lessonPlan, human,
}: {
  sessionId: string;
  template: Template;
  presenter: string;
  topic: string | null;
  audience: string | null;
  sceneLabel: string;
  lessonPlan: string | null;
  human: Record<string, HumanStat>;
}) {
  const items: ScoredItem[] = scoredOf(template.items);
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);
  const [manual, setManual] = useState<{ answer: string; copied: boolean } | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null | undefined>(undefined);
  const [draft, setDraft] = useState<string | null>(null); // 전사문 편집 중
  const [minutes, setMinutes] = useState({ planned: "", actual: "" }); // 계획·실제 수업 시간(분)
  const [runs, setRuns] = useState<Run[]>([]);
  const [runId, setRunId] = useState<number | null>(null);
  const [scores, setScores] = useState<AiScore[]>([]);
  const [busy, setBusy] = useState(false);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const [material, setMaterial] = useState<MaterialRow | null>(null);

  useEffect(() => {
    supabase
      .from("materials").select("id, file_name, mime, size_bytes, storage_path, page_count, extract_status, extracted, created_at")
      .eq("session_id", sessionId).order("created_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => setMaterial((data as MaterialRow | null) ?? null));
    supabase
      .from("transcripts").select("id, content, source, created_at, planned_minutes, actual_minutes")
      .eq("session_id", sessionId).order("created_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => setTranscript(data ?? null));
    supabase
      .from("ai_runs").select("id, created_at, model, prompt_version, summary, usage")
      .eq("session_id", sessionId).order("created_at", { ascending: false })
      .then(({ data }) => {
        const list = (data as Run[]) ?? [];
        setRuns(list);
        setRunId((cur) => cur ?? list[0]?.id ?? null);
      });
  }, [sessionId, reloadKey]);

  useEffect(() => {
    if (runId === null) return;
    supabase
      .from("ai_scores").select("item_id, score, evidence, rationale, next_action")
      .eq("run_id", runId)
      .then(({ data }) => setScores((data as AiScore[]) ?? []));
  }, [runId]);

  useEffect(() => {
    fetch("/api/ai-score").then((r) => r.json()).then((b) => setApiAvailable(!!b.available))
      .catch(() => setApiAvailable(false));
  }, []);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  async function saveTranscript() {
    if (!draft?.trim()) return;
    setBusy(true);
    const toMin = (v: string) => (/^\d+$/.test(v.trim()) && Number(v) > 0 ? Number(v) : null);
    const { error } = await supabase.from("transcripts").insert({
      session_id: sessionId,
      content: draft.trim(),
      planned_minutes: toMin(minutes.planned),
      actual_minutes: toMin(minutes.actual),
    });
    setBusy(false);
    if (error) return alert("저장 실패: " + error.message);
    setDraft(null);
    setReloadKey((k) => k + 1);
  }

  async function runAi() {
    setRunning(true);
    setElapsed(0);
    const { data } = await supabase.auth.getSession();
    const res = await fetch("/api/ai-score", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${data.session?.access_token ?? ""}`,
      },
      body: JSON.stringify({ sessionId }),
    });
    const body = await res.json().catch(() => ({}));
    setRunning(false);
    if (!res.ok) return alert(body.error ?? "AI 채점 실패");
    setRunId(body.runId);
    setReloadKey((k) => k + 1);
  }

  // 수동 모드 ①: claude.ai에 붙여 넣을 요청문 복사
  async function copyManualPrompt() {
    if (!transcript) return;
    await navigator.clipboard.writeText(
      buildManualPrompt({
        template, presenter, topic, audience, sceneLabel, lessonPlan, transcript: transcript.content,
        materialText: material ? materialPromptText(material) : null,
        majorText: (() => {
          const m = findMajor(topic);
          return m ? majorPromptText(m) : null;
        })(),
        plannedMinutes: transcript.planned_minutes, actualMinutes: transcript.actual_minutes,
      })
    );
    setManual({ answer: manual?.answer ?? "", copied: true });
  }

  // 수동 모드 ②: claude.ai의 답을 검사해서 API 채점과 똑같이 저장
  async function saveManualAnswer() {
    if (!transcript || !manual) return;
    let out;
    try {
      out = parseAiOutput(manual.answer, items.map((i) => i.id));
    } catch (e) {
      return alert("답변을 읽지 못했어요: " + (e as Error).message);
    }
    setBusy(true);
    const { data: saved, error } = await supabase
      .from("ai_runs")
      .insert({
        session_id: sessionId,
        transcript_id: transcript.id,
        rubric_type: template.id,
        model: "claude.ai (수동)",
        prompt_version: PROMPT_VERSION + "-manual",
        summary: { strengths: out.strengths, improvements: out.improvements },
      })
      .select("id")
      .single();
    if (error || !saved) {
      setBusy(false);
      return alert("저장 실패: " + (error?.message ?? ""));
    }
    const { error: scoreErr } = await supabase.from("ai_scores").insert(
      out.items.map((it) => ({
        run_id: saved.id,
        item_id: it.item_id,
        score: it.score === "NA" ? null : Number(it.score),
        evidence: it.evidence.map((q) => ({ quote: q, verified: verifyQuote(q, transcript.content) })),
        rationale: it.rationale,
        next_action: it.next_action,
      }))
    );
    setBusy(false);
    if (scoreErr) return alert("점수 저장 실패: " + scoreErr.message);
    setManual(null);
    setRunId(saved.id);
    setReloadKey((k) => k + 1);
  }

  const run = runs.find((r) => r.id === runId) ?? null;
  const scoreOf = (id: string) => scores.find((s) => s.item_id === id);

  // 사람-AI 일치도: 둘 다 점수가 있는 항목만
  const pairs = items
    .map((i) => ({ h: human[i.id]?.avg ?? null, a: scoreOf(i.id)?.score ?? null }))
    .filter((p): p is { h: number; a: number } => p.h !== null && p.a !== null);
  const hasHuman = Object.values(human).some((h) => h.avg !== null);
  const aiScored = items.map((i) => scoreOf(i.id)?.score).filter((v): v is number => v != null);
  const aiAvg = aiScored.length > 0 ? aiScored.reduce((a, b) => a + b, 0) / aiScored.length : 0;
  const exact = pairs.filter((p) => Math.abs(p.a - p.h) < 0.5).length;
  const within1 = pairs.filter((p) => Math.abs(p.a - p.h) <= 1).length;

  return (
    <Card className="border-primary/40">
      <CardHeader>
        <CardTitle>AI 채점</CardTitle>
        <CardDescription>
          수업 전사문으로 AI가 평가지에 따라 채점해요. 사람 평가와는 따로 진행되고, 사람 평가가 있으면 항목별로 비교해 보여 줘요.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {/* ── 1. 전사문 ── */}
        <div className="space-y-2">
          <p className="font-medium">1. 전사문</p>
          {transcript === undefined && <p className="text-muted-foreground">불러오는 중...</p>}
          {draft === null ? (
            <>
              {transcript ? (
                <p className="text-muted-foreground">
                  저장됨 · {transcript.content.length.toLocaleString()}자
                  {" · "}계획 {transcript.planned_minutes ?? "-"}분 / 실제 {transcript.actual_minutes ?? "-"}분
                  {" · "}{transcript.created_at.slice(0, 16).replace("T", " ")}
                </p>
              ) : transcript === null ? (
                <p className="text-muted-foreground">
                  아직 전사문이 없어요. 수업 녹음을 클로바노트 같은 받아쓰기 앱으로 글로 옮긴 뒤 붙여 넣어 주세요.
                  (시간 표시·화자 표시가 있어도 괜찮아요)
                </p>
              ) : null}
              <Button size="sm" variant="outline" onClick={() => {
                setDraft(transcript?.content ?? "");
                setMinutes({
                  planned: transcript?.planned_minutes?.toString() ?? "",
                  actual: transcript?.actual_minutes?.toString() ?? "",
                });
              }}>
                {transcript ? "전사문 새로 넣기" : "전사문 붙여넣기"}
              </Button>
            </>
          ) : (
            <>
              <Textarea className="min-h-48 font-mono text-xs" value={draft}
                placeholder={"예)\n[00:12] 멘토: 안녕하세요, 오늘은 기계공학과를 소개할게요.\n[00:20] 학생: ..."}
                onChange={(e) => setDraft(e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1 text-xs">
                  <span className="text-muted-foreground">계획 시간(분)</span>
                  <Input inputMode="numeric" placeholder="예) 30" value={minutes.planned}
                    onChange={(e) => setMinutes({ ...minutes, planned: e.target.value })} />
                </label>
                <label className="space-y-1 text-xs">
                  <span className="text-muted-foreground">실제 수업 시간(분)</span>
                  <Input inputMode="numeric" placeholder="예) 28" value={minutes.actual}
                    onChange={(e) => setMinutes({ ...minutes, actual: e.target.value })} />
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                AI는 전사문만으로 수업이 몇 분이었는지 알 수 없어요. 시간을 적어야 시간 관리를 제대로 채점해요.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setDraft(null)}>취소</Button>
                <Button disabled={busy || !draft.trim()} onClick={saveTranscript}>저장</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                새로 저장해도 이전 전사문은 기록으로 남아요. AI 채점은 가장 최근 전사문으로 해요.
              </p>
            </>
          )}
        </div>

        {/* ── 2. 실행 ── */}
        <div className="space-y-2">
          <p className="font-medium">2. AI 채점</p>
          {apiAvailable && (
            <Button className="w-full" disabled={!transcript || running || draft !== null} onClick={runAi}>
              {running ? `채점 중... ${elapsed}초 (1~2분 걸려요)` : runs.length > 0 ? "다시 채점하기" : "AI 채점 실행"}
            </Button>
          )}

          {/* 수동 모드: API 키가 없을 때 claude.ai로 */}
          {apiAvailable === false && (
            <div className="space-y-2 rounded-md border border-dashed p-2">
              <p className="text-xs text-muted-foreground">
                API 키가 아직 없어서 <b>수동 모드</b>로 채점해요. 요청문을 claude.ai에 붙여 넣고, Claude의 답을 아래에 붙여 넣으세요.
                결과는 자동 채점과 똑같이 저장·비교돼요.
              </p>
              <Button size="sm" variant="outline" className="w-full" disabled={!transcript || draft !== null}
                onClick={copyManualPrompt}>
                {manual?.copied ? "① 복사됨! claude.ai에 붙여 넣으세요" : "① 채점 요청문 복사"}
              </Button>
              {manual?.copied && (
                <>
                  <Textarea className="min-h-32 font-mono text-xs" placeholder="② Claude의 답(JSON)을 여기에 붙여 넣기"
                    value={manual.answer} onChange={(e) => setManual({ ...manual, answer: e.target.value })} />
                  <Button size="sm" className="w-full" disabled={busy || !manual.answer.trim()} onClick={saveManualAnswer}>
                    ③ 검사하고 저장
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    ⚠ 실제 멘토의 전사문을 claude.ai에 넣기 전에 claude.ai 설정에서 대화를 모델 개선에 쓰는 옵션을 꺼 두세요.
                    테스트용 전사문은 상관없어요.
                  </p>
                </>
              )}
            </div>
          )}
          {runs.length > 1 && (
            <select className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
              value={runId ?? ""} onChange={(e) => setRunId(Number(e.target.value))}>
              {runs.map((r, i) => (
                <option key={r.id} value={r.id}>
                  {i === 0 ? "최근 · " : ""}{r.created_at.slice(0, 16).replace("T", " ")} · {r.model} · {r.prompt_version}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* ── 3. 결과 ── */}
        {run && (
          <div className="space-y-3">
            <p className="font-medium">3. AI 채점 결과{hasHuman && " · 사람 평가와 비교"}</p>

            {aiScored.length > 0 && (
              <p className="rounded-md border border-primary/40 px-3 py-2">
                AI 평균 <b className="text-lg">{aiAvg.toFixed(1)}</b> / 4
                <span className="text-xs text-muted-foreground">
                  {" "}· 채점 {aiScored.length}개 항목
                  {items.length - aiScored.length > 0 && ` (판단 불가 ${items.length - aiScored.length}개는 평균에서 제외)`}
                </span>
              </p>
            )}

            {pairs.length > 0 && (
              <p className="rounded-md bg-muted px-3 py-2">
                비교 가능한 {pairs.length}개 항목 중 <b>거의 같음 {exact}개</b> (차이 0.5 미만),{" "}
                <b>1점 이내 {within1}개</b>
              </p>
            )}

            <div className="divide-y rounded-md border">
              {items.map((item) => {
                const s = scoreOf(item.id);
                const h = human[item.id];
                const diff = s?.score != null && h?.avg != null ? s.score - h.avg : null;
                const expanded = open === item.id;
                return (
                  <div key={item.id} className="p-2">
                    <button className="flex w-full items-center justify-between gap-2 text-left"
                      onClick={() => setOpen(expanded ? null : item.id)}>
                      <span>{item.title}</span>
                      <span className="flex shrink-0 items-center gap-2 text-xs">
                        {hasHuman && (
                          <span className="text-muted-foreground">사람 {h?.avg != null ? h.avg.toFixed(1) : "-"}</span>
                        )}
                        <span className="font-semibold">
                          AI {s ? (s.score != null ? `${s.score} / 4` : "판단 불가") : "-"}
                        </span>
                        {diff !== null && Math.abs(diff) > 1 && (
                          <span className="rounded bg-destructive/15 px-1 text-destructive">차이 큼</span>
                        )}
                        <span className="text-muted-foreground">{expanded ? "▲" : "▼"}</span>
                      </span>
                    </button>
                    {expanded && s && (
                      <div className="mt-2 space-y-2 text-xs">
                        {s.score != null && (
                          <p className="rounded bg-primary/10 px-2 py-1">
                            <b>{s.score}점 기준:</b> {item.levels[s.score - 1]}
                          </p>
                        )}
                        {s.rationale && <p>{s.rationale}</p>}
                        {s.evidence.length > 0 && (
                          <ul className="space-y-1">
                            {s.evidence.map((e, i) => (
                              <li key={i} className="rounded bg-muted px-2 py-1">
                                {e.verified ? "✓ " : "⚠ 전사문에서 못 찾음 · "}“{e.quote}”
                              </li>
                            ))}
                          </ul>
                        )}
                        {s.next_action && <p><b>다음 행동:</b> {s.next_action}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {run.summary && (
              <div className="grid gap-2">
                <div className="rounded-md bg-muted px-3 py-2">
                  <p className="font-medium">AI가 본 잘한 점</p>
                  <ul className="ml-4 list-disc">{run.summary.strengths.map((t, i) => <li key={i}>{t}</li>)}</ul>
                </div>
                <div className="rounded-md bg-muted px-3 py-2">
                  <p className="font-medium">AI가 본 개선할 점</p>
                  <ul className="ml-4 list-disc">{run.summary.improvements.map((t, i) => <li key={i}>{t}</li>)}</ul>
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {run.model} · 프롬프트 {run.prompt_version}
              {run.usage?.input_tokens != null &&
                ` · 토큰 입력 ${run.usage.input_tokens.toLocaleString()} / 출력 ${(run.usage.output_tokens ?? 0).toLocaleString()}`}
              {" · "}⚠ 표시된 인용은 AI가 전사문에 없는 말을 만들었을 수 있어요. 그 항목 점수는 믿지 마세요.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
