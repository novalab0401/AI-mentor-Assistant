// 발표 자료 올리기: 파일 보관 → 슬라이드별 글자 읽기 → 기록
//  - PDF: Claude가 슬라이드를 직접 보고 장별 글자를 뽑아요 (채점 때는 PDF 화면 자체를 다시 보여 줘요)
//  - PPTX: 서버에서 슬라이드 글자와 발표자 노트를 뽑아요 (그림·배치는 못 봐요)
// 뽑은 글자는 DB에 남아서 나중에 학과별 자료 검색·챗봇의 바탕이 돼요.

import { createClient } from "@supabase/supabase-js";
import { MATERIAL_MAX_BYTES, PDF_MIME, PPTX_MIME } from "@/lib/materials";
import { extractPptx } from "@/lib/pptx-text";

export const maxDuration = 300;

const fail = (status: number, message: string) => Response.json({ error: message }, { status });
const EXTRACT_MODEL = process.env.AI_EXTRACT_MODEL || "claude-haiku-5-5";

async function extractPdfWithClaude(buf: Buffer, apiKey: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: EXTRACT_MODEL,
      max_tokens: 16000,
      system:
        "너는 발표 자료를 읽어 슬라이드(페이지)별로 정리하는 도우미다. 각 페이지에 보이는 글자를 빠짐없이 옮기고, 그림·사진·도표가 있으면 [그림: 무엇을 보여 주는지 한 줄]로 적는다. 해석이나 평가는 하지 않는다. 한국어로 쓴다.",
      messages: [{
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: PDF_MIME, data: buf.toString("base64") } },
          { type: "text", text: "이 발표 자료를 페이지별로 정리해 줘." },
        ],
      }],
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object", additionalProperties: false, required: ["page_count", "slides"],
            properties: {
              page_count: { type: "integer" },
              slides: {
                type: "array",
                items: {
                  type: "object", additionalProperties: false, required: ["n", "text"],
                  properties: { n: { type: "integer" }, text: { type: "string" } },
                },
              },
            },
          },
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`Claude API 오류 (${res.status})`);
  const msg = await res.json();
  if (msg.stop_reason === "max_tokens") throw new Error("자료가 너무 길어 끝까지 읽지 못했어요.");
  const text = (msg.content as { type: string; text?: string }[]).find((b) => b.type === "text")?.text ?? "";
  return JSON.parse(text) as { page_count: number; slides: { n: number; text: string }[] };
}

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return fail(401, "로그인이 필요해요.");
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } }
  );

  const form = await request.formData().catch(() => null);
  const sessionId = form?.get("sessionId");
  const file = form?.get("file");
  if (typeof sessionId !== "string" || !(file instanceof File)) return fail(400, "수업 번호나 파일이 없어요.");

  const { data: allowed } = await sb.rpc("can_ai_session", { sid: sessionId });
  if (allowed !== true) return fail(403, "이 수업에 자료를 올릴 권한이 없어요.");

  const lower = file.name.toLowerCase();
  const kind = lower.endsWith(".pdf") ? "pdf" : lower.endsWith(".pptx") ? "pptx" : null;
  if (!kind) {
    return fail(400, lower.endsWith(".ppt") || lower.endsWith(".key")
      ? "예전 PPT·키노트 파일은 읽을 수 없어요. PDF로 내보내서 올려 주세요."
      : "PDF 또는 PPTX 파일만 올릴 수 있어요. (가장 정확한 건 PDF)");
  }
  if (file.size > MATERIAL_MAX_BYTES) return fail(400, "파일이 20MB보다 커요. PDF로 내보낼 때 '최소 크기'를 고르거나 사진을 줄여 주세요.");

  const buf = Buffer.from(await file.arrayBuffer());
  const mime = kind === "pdf" ? PDF_MIME : PPTX_MIME;
  const path = `${sessionId}/${Date.now()}.${kind}`; // 파일 이름은 기록에만 남기고 보관 경로는 영문으로

  const { error: upErr } = await sb.storage.from("materials").upload(path, buf, { contentType: mime });
  if (upErr) return fail(500, "파일 보관 실패: " + upErr.message);

  // 슬라이드별 글자 읽기 (실패해도 파일은 남겨요)
  let extracted: { slides: { n: number; text: string; notes?: string }[] } | null = null;
  let pageCount: number | null = null;
  let status: "ok" | "failed" = "ok";
  let note = "";
  try {
    if (kind === "pptx") {
      extracted = extractPptx(buf);
      pageCount = extracted.slides.length;
    } else {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("API 키가 없어 PDF를 읽지 못했어요.");
      const out = await extractPdfWithClaude(buf, apiKey);
      extracted = { slides: out.slides };
      pageCount = out.page_count || out.slides.length;
    }
  } catch (e) {
    status = "failed";
    note = (e as Error).message;
  }

  const { data: row, error } = await sb
    .from("materials")
    .insert({
      session_id: sessionId, file_name: file.name, mime, size_bytes: file.size, storage_path: path,
      page_count: pageCount, extracted, extract_status: status,
    })
    .select("id").single();
  if (error || !row) return fail(500, "자료 기록 실패: " + (error?.message ?? ""));
  return Response.json({ id: row.id, status, note, pageCount });
}
