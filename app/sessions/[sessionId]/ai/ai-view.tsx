"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import BackLink from "@/components/back-link";
import AudienceFields from "@/components/audience-fields";
import { Button } from "@/components/ui/button";
import { audienceFromRow, audienceToRow, describeAudience, type Audience } from "@/lib/audience";
import { findMajor } from "@/lib/majors";
import ScenePicker from "@/components/scene-picker";
import PlanField from "@/components/plan-field";
import PlanReviewPanel from "@/components/plan-review-panel";
import MaterialsPanel from "@/components/materials-panel";
import AiPanel, { type HumanStat } from "@/components/ai-panel";
import { supabase } from "@/lib/supabase";
import { getTemplate, sceneLabel, scoredOf, type Scene } from "@/lib/rubric";

type Session = {
  session_no: number; mentor_name: string; major: string | null; session_date: string;
  rubric_type: string; group_id: string; presenter_id: string | null;
  audience_level: string | null; audience_note: string | null; audience_size: number | null;
  scene: Scene; lesson_plan: string | null;
  presenter_university: string | null; presenter_department: string | null;
};

// AI 평가 전용 화면 — 사람 평가와 독립적이에요.
// 관리하는 사람(운영진·팀장)과 평가받는 본인이 전사문을 올리고 AI 평가를 돌릴 수 있어요.
export default function AiView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [human, setHuman] = useState<Record<string, HumanStat>>({});
  const [canManage, setCanManage] = useState(false);
  const [audienceEdit, setAudienceEdit] = useState<Audience | null>(null);
  const [ctxEdit, setCtxEdit] = useState<{ scene: Scene; plan: string } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    supabase
      .from("sessions")
      .select("session_no, mentor_name, major, session_date, rubric_type, group_id, presenter_id, audience_level, audience_note, audience_size, scene, lesson_plan, presenter_university, presenter_department")
      .eq("id", sessionId)
      .single()
      .then(({ data }) => setSession(data ?? null));
  }, [sessionId, reloadKey]);

  useEffect(() => {

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


  if (session === undefined) return <main className="p-4">불러오는 중...</main>;
  if (session === null) return <main className="p-4">이 수업을 볼 권한이 없거나 존재하지 않아요.</main>;

  const template = getTemplate(session.rubric_type, session.scene);
  const audience = describeAudience(session);
  const majorProfile = template.id.startsWith("mentor") ? findMajor(session.major) : null;

  async function saveContext() {
    if (!ctxEdit) return;
    const { error } = await supabase.rpc("set_session_context", {
      p_session: sessionId, p_scene: ctxEdit.scene, p_plan: ctxEdit.plan,
    });
    if (error) return alert("저장 실패: " + error.message);
    setCtxEdit(null);
    setReloadKey((k) => k + 1);
  }

  async function saveAudience() {
    if (!audienceEdit) return;
    const row = audienceToRow(audienceEdit);
    const { error } = await supabase.rpc("set_session_audience", {
      p_session: sessionId, p_level: row.audience_level ?? "", p_note: row.audience_note ?? "", p_size: row.audience_size,
    });
    if (error) return alert("저장 실패: " + error.message);
    setAudienceEdit(null);
    setReloadKey((k) => k + 1);
  }

  return (
    <main className="mx-auto max-w-md space-y-4 p-4">
      <BackLink href={canManage ? `/sessions/${sessionId}` : "/"} label={canManage ? "수업 화면" : "홈"} />
      <div>
        <p className="text-sm text-muted-foreground">
          시연 #{session.session_no} · {session.session_date} · {template.name} · {sceneLabel(session.scene)}
        </p>
        <h1 className="text-xl font-bold">
          AI 평가 · {session.mentor_name}
          {session.major && <span className="font-normal"> · {session.major}</span>}
        </h1>
        {(session.presenter_university || session.presenter_department) && (
          <p className="text-xs text-muted-foreground">
            발표자 소속: {[session.presenter_university, session.presenter_department].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>


      <p className="rounded-md bg-muted p-3 text-sm">
        {canManage
          ? "AI 결과는 평가받는 본인에게 바로 보여요. 운영진은 사람 평가와 비교해 AI가 믿을 만한지 검증해요."
          : "내 수업의 전사문을 올리면 AI가 바로 채점하고 다음에 해 볼 행동을 알려 줘요. 혼자서 몇 번이든 연습할 수 있어요."}
        <span className="mt-1 block text-xs text-muted-foreground">
          AI 평가는 지금 사람 평가와 비교하며 검증 중이에요. 참고용으로 활용해 주세요.
        </span>
      </p>

      {/* ── 학과 자료 ── */}
      {template.id.startsWith("mentor") && (
        <p className="rounded-md border px-3 py-2 text-xs text-muted-foreground">
          {majorProfile ? (
            <>
              <b className="text-foreground">학과 자료 연결됨</b> · {majorProfile.name} ·{" "}
              <a href={majorProfile.source.url} target="_blank" rel="noreferrer" className="underline">
                {majorProfile.source.label}
              </a>
              <br />AI가 전공·진로 정보가 맞는지, 고등학생에게 어떤 과목·활동을 권할지 이 자료를 기준으로 판단해요.
            </>
          ) : (
            <>학과 자료 없음 · 이 전공은 아직 학과 자료가 없어 AI가 일반 지식으로 정확성을 판단해요.</>
          )}
        </p>
      )}

      {/* ── 평가 장면·수업 계획 ── */}
      <div className="space-y-2 rounded-md border p-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <p><b>평가 장면</b> · {sceneLabel(session.scene)}</p>
          {!ctxEdit && (
            <Button size="sm" variant="outline"
              onClick={() => setCtxEdit({ scene: session.scene, plan: session.lesson_plan ?? "" })}>
              {session.lesson_plan ? "장면·계획 수정" : "장면 수정·계획 입력"}
            </Button>
          )}
        </div>
        {session.scene === "solo" && !ctxEdit && (
          <p className="text-xs text-muted-foreground">학생 없이 한 연습이라 학생과 주고받는 항목(질문의 질, 학생 파악, 학생 질문 응답 등)은 빼고 평가해요.</p>
        )}
        {ctxEdit ? (
          <>
            <ScenePicker value={ctxEdit.scene} onChange={(scene) => setCtxEdit({ ...ctxEdit, scene })} />
            <p className="pt-1 font-medium">수업 계획 (선택)</p>
            <PlanField value={ctxEdit.plan} onChange={(plan) => setCtxEdit({ ...ctxEdit, plan })} />
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" onClick={() => setCtxEdit(null)}>취소</Button>
              <Button size="sm" onClick={saveContext}>저장</Button>
            </div>
          </>
        ) : session.lesson_plan ? (
          <>
            <p className="font-medium">수업 계획</p>
            <p className="whitespace-pre-wrap rounded-md bg-muted p-2 text-xs">{session.lesson_plan}</p>
            <PlanReviewPanel sessionId={sessionId} plan={session.lesson_plan} reloadKey={reloadKey} />
          </>
        ) : (
          <p className="text-xs text-muted-foreground">수업 계획(순서·시간)을 적으면 수업 전에 AI가 계획을 검토하고, 수업 후에는 계획대로 했는지도 봐요.</p>
        )}
      </div>

      {/* ── 수업 대상 ── */}
      <div className="space-y-2 rounded-md border p-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <p>
            <b>수업 대상</b> · {audience ?? <span className="text-muted-foreground">입력 안 됨</span>}
          </p>
          {!audienceEdit && (
            <Button size="sm" variant="outline" onClick={() => setAudienceEdit(audienceFromRow(session))}>
              {audience ? "수정" : "입력"}
            </Button>
          )}
        </div>
        {!audience && !audienceEdit && (
          <p className="text-xs text-muted-foreground">
            대상을 적으면 AI가 설명·용어 수준이 그 학생들에게 맞았는지까지 채점해요. 바꾼 뒤에는 다시 채점하세요.
          </p>
        )}
        {audienceEdit && (
          <>
            <AudienceFields value={audienceEdit} onChange={setAudienceEdit} />
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" onClick={() => setAudienceEdit(null)}>취소</Button>
              <Button size="sm" onClick={saveAudience}>저장</Button>
            </div>
          </>
        )}
      </div>

      <MaterialsPanel sessionId={sessionId} onChange={() => setReloadKey((k) => k + 1)} />

      <AiPanel
        key={reloadKey}
        sessionId={sessionId}
        template={template}
        presenter={session.mentor_name}
        topic={session.major}
        audience={audience}
        sceneLabel={sceneLabel(session.scene)}
        lessonPlan={session.lesson_plan}
        human={human}
      />
      <p className="text-xs text-muted-foreground">평가 항목 {scoredOf(template.items).length}개</p>
    </main>
  );
}
