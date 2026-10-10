// AI 채점 서버 창구
// 브라우저 → (로그인 토큰과 수업 번호) → 여기 → Claude API → 결과를 DB에 저장
// Claude API 키는 이 서버 코드에서만 써서 브라우저에 절대 노출되지 않아요.

import { createClient } from "@supabase/supabase-js";
import { getTemplate, scoredOf } from "@/lib/rubric";
import {
  DEFAULT_MODEL, PROMPT_VERSION, SYSTEM_PROMPT, buildUserPrompt, outputSchema, verifyQuote,
  type AiOutput,
} from "@/lib/ai-scoring";
import { describeAudience } from "@/lib/audience";
import { findMajor, majorPromptText } from "@/lib/majors";

export const maxDuration = 300; // 긴 전사문은 채점에 1~2분 걸릴 수 있어요

const fail = (status: number, message: string) => Response.json({ error: message }, { status });

// 화면이 "API로 자동 채점"을 보여 줄지 정할 때 써요 (키 값은 절대 돌려주지 않아요)
export async function GET() {
  return Response.json({ available: !!process.env.ANTHROPIC_API_KEY });
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fail(500, "서버에 ANTHROPIC_API_KEY가 설정되지 않았어요. .env.local을 확인해 주세요.");

  // 1) 누가 요청했는지 확인: 브라우저가 보낸 로그인 토큰으로 Supabase에 접속
  //    → 그 사람의 권한(RLS) 그대로 읽고 쓰게 돼요
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return fail(401, "로그인이 필요해요.");
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } }
  );

  const { sessionId } = (await request.json().catch(() => ({}))) as { sessionId?: string };
  if (!sessionId) return fail(400, "수업 번호가 없어요.");

  // 관리하는 사람(운영진·팀장·Nova Lab) 또는 평가받는 본인
  const { data: allowed } = await sb.rpc("can_ai_session", { sid: sessionId });
  if (allowed !== true) return fail(403, "이 수업을 AI로 채점할 권한이 없어요.");

  // 2) 수업 정보와 가장 최근 전사문
  const { data: session } = await sb
    .from("sessions").select("id, mentor_name, major, rubric_type, audience_level, audience_note, audience_size")
    .eq("id", sessionId).single();
  if (!session) return fail(404, "수업을 찾을 수 없어요.");

  const { data: transcript } = await sb
    .from("transcripts").select("id, content, planned_minutes, actual_minutes").eq("session_id", sessionId)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!transcript) return fail(400, "먼저 전사문을 저장해 주세요.");

  const template = getTemplate(session.rubric_type);
  const items = scoredOf(template.items);
  const model = process.env.AI_MODEL || DEFAULT_MODEL;

  // 3) Claude 호출 (정해진 JSON 형식으로만 답하게)
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildUserPrompt({
            template,
            presenter: session.mentor_name,
            topic: session.major,
            transcript: transcript.content,
            audience: describeAudience(session),
            majorText: (() => {
              const m = findMajor(session.major);
              return m ? majorPromptText(m, session.audience_level) : null;
            })(),
            plannedMinutes: transcript.planned_minutes,
            actualMinutes: transcript.actual_minutes,
          }),
        },
      ],
      output_config: { format: { type: "json_schema", schema: outputSchema(items.map((i) => i.id)) } },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return fail(502, `Claude API 오류 (${res.status}): ${detail.slice(0, 300)}`);
  }
  const msg = await res.json();
  if (msg.stop_reason === "max_tokens") return fail(502, "AI 답변이 너무 길어 중간에 끊겼어요. 다시 시도해 주세요.");
  if (msg.stop_reason === "refusal") return fail(502, "AI가 이 요청에 답하지 않았어요.");

  let out: AiOutput;
  try {
    const text = (msg.content as { type: string; text?: string }[]).find((b) => b.type === "text")?.text ?? "";
    out = JSON.parse(text);
  } catch {
    return fail(502, "AI 답변을 읽지 못했어요. 다시 시도해 주세요.");
  }

  // 4) 저장: 실행 1줄 + 항목별 점수 (근거 인용이 전사문에 실제로 있는지 표시)
  const { data: run, error: runErr } = await sb
    .from("ai_runs")
    .insert({
      session_id: sessionId,
      transcript_id: transcript.id,
      rubric_type: session.rubric_type,
      model,
      prompt_version: PROMPT_VERSION,
      summary: { strengths: out.strengths, improvements: out.improvements },
      usage: msg.usage ?? null,
    })
    .select("id")
    .single();
  if (runErr || !run) return fail(500, "결과 저장 실패: " + (runErr?.message ?? ""));

  const rows = out.items
    .filter((it) => items.some((i) => i.id === it.item_id))
    .map((it) => ({
      run_id: run.id,
      item_id: it.item_id,
      score: it.score === "NA" ? null : Number(it.score),
      evidence: it.evidence.map((q) => ({ quote: q, verified: verifyQuote(q, transcript.content) })),
      rationale: it.rationale,
      next_action: it.next_action,
    }));
  const { error: scoreErr } = await sb.from("ai_scores").insert(rows);
  if (scoreErr) return fail(500, "점수 저장 실패: " + scoreErr.message);

  return Response.json({ runId: run.id, usage: msg.usage ?? null });
}
