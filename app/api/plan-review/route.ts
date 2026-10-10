// 수업 계획 AI 사전 검토 서버 창구 (구조는 app/api/ai-score와 같아요)

import { createClient } from "@supabase/supabase-js";
import { getTemplate, sceneLabel } from "@/lib/rubric";
import { DEFAULT_MODEL } from "@/lib/ai-scoring";
import { describeAudience } from "@/lib/audience";
import { findMajor, majorPromptText } from "@/lib/majors";
import { PLAN_PROMPT_VERSION, PLAN_SYSTEM_PROMPT, buildPlanPrompt, planOutputSchema, type PlanReview } from "@/lib/plan-review";

export const maxDuration = 120;

const fail = (status: number, message: string) => Response.json({ error: message }, { status });

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fail(500, "서버에 ANTHROPIC_API_KEY가 설정되지 않았어요.");

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return fail(401, "로그인이 필요해요.");
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } }
  );

  const { sessionId } = (await request.json().catch(() => ({}))) as { sessionId?: string };
  if (!sessionId) return fail(400, "수업 번호가 없어요.");

  const { data: allowed } = await sb.rpc("can_ai_session", { sid: sessionId });
  if (allowed !== true) return fail(403, "이 수업의 계획을 검토할 권한이 없어요.");

  const { data: session } = await sb
    .from("sessions")
    .select("id, major, rubric_type, audience_level, audience_note, audience_size, scene, lesson_plan")
    .eq("id", sessionId).single();
  if (!session) return fail(404, "수업을 찾을 수 없어요.");
  if (!session.lesson_plan?.trim()) return fail(400, "먼저 수업 계획을 적어 주세요.");

  // 계획 시간은 가장 최근 전사문에 적은 값이 있으면 참고해요
  const { data: tr } = await sb
    .from("transcripts").select("planned_minutes").eq("session_id", sessionId)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();

  const template = getTemplate(session.rubric_type, session.scene);
  const major = template.id.startsWith("mentor") ? findMajor(session.major) : null;
  const model = process.env.AI_MODEL || DEFAULT_MODEL;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model,
      max_tokens: 6000,
      system: PLAN_SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: buildPlanPrompt({
          templateName: template.name,
          topic: session.major,
          audience: describeAudience(session),
          sceneLabel: sceneLabel(session.scene),
          plannedMinutes: tr?.planned_minutes ?? null,
          plan: session.lesson_plan,
          majorText: major ? majorPromptText(major, session.audience_level) : null,
        }),
      }],
      output_config: { format: { type: "json_schema", schema: planOutputSchema() } },
    }),
  });
  if (!res.ok) return fail(502, `Claude API 오류 (${res.status}): ${(await res.text()).slice(0, 300)}`);
  const msg = await res.json();
  if (msg.stop_reason === "max_tokens") return fail(502, "AI 답변이 너무 길어 끊겼어요.");

  let out: PlanReview;
  try {
    const text = (msg.content as { type: string; text?: string }[]).find((b) => b.type === "text")?.text ?? "";
    out = JSON.parse(text);
  } catch {
    return fail(502, "AI 답변을 읽지 못했어요. 다시 시도해 주세요.");
  }

  const { data: saved, error } = await sb
    .from("plan_reviews")
    .insert({
      session_id: sessionId, plan: session.lesson_plan, result: out,
      model, prompt_version: PLAN_PROMPT_VERSION, usage: msg.usage ?? null,
    })
    .select("id").single();
  if (error || !saved) return fail(500, "검토 저장 실패: " + (error?.message ?? ""));
  return Response.json({ id: saved.id, result: out });
}
