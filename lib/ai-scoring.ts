// AI 채점: 프롬프트, 출력 형식, 근거 인용 검증
// 서버(app/api/ai-score)에서만 써요.

import type { ScoredItem, Template } from "./rubric";

// 프롬프트를 고치면 버전을 올리세요. 결과마다 어떤 버전으로 채점했는지 남아서 비교할 수 있어요.
export const PROMPT_VERSION = "v14-2026-10-10"; // v14: 발표 자료(PDF 화면·PPTX 글자) 반영 // v11: 평가 장면, 수업 계획 대비 실행, 활동은 상황에 맞게
export const DEFAULT_MODEL = "claude-sonnet-5-5";

export const SYSTEM_PROMPT = `너는 Nova Lab의 수업 평가 보조 AI다. 전문가가 만든 평가 기준(루브릭)에 따라 수업 전사문을 채점한다.

원칙:
1. 각 항목은 그 항목의 1~4점 기준 문장에 비추어 가장 가까운 점수를 고른다. 기준에 없는 잣대를 새로 만들지 않는다.
2. 모든 점수에는 전사문에서 그대로 옮긴 근거 발화를 1~3개 붙인다. 인용은 전사문 원문을 한 글자도 바꾸지 않고 복사한다. 시간 표시와 화자 표시는 빼도 된다. 긴 발화는 핵심 부분만 잘라 인용한다.
3. 전사문만으로 판단할 수 없는 항목(예: 시선·표정·제스처 같은 비언어 행동, 화면·판서처럼 말로 드러나지 않는 것)은 score를 "NA"로 하고, rationale에 판단할 수 없는 이유를 쓴다. 추측해서 점수를 주지 않는다. 이때 evidence는 비워도 된다.
4. 사람의 심리·성격·의도를 추측하지 않는다. 관찰 가능한 발화와 진행만 근거로 삼는다.
5. 질문 개수 같은 양보다 학습 목표와의 정합성, 학생 답에 이어지는 후속 질문, 대상 수준에의 적합성 같은 질을 본다.
6. rationale은 어떤 기준 문장에 왜 해당하는지 2~3문장으로 쓴다.
7. next_action은 다음 수업에서 바로 해 볼 수 있는 구체적인 행동 한 가지로 쓴다. 예: "3번 슬라이드 설명 뒤에 '방금 내용을 친구에게 한 문장으로 설명해 볼래?'라고 묻는다."
8. strengths와 improvements는 수업 전체에 대한 핵심 2~3개씩, 근거가 되는 장면을 함께 쓴다.
9. 모든 글은 한국어로 쓴다.
10. 수업 길이는 다음 순서로 판단한다. ① '수업 정보'에 실제 수업 시간이 있으면 그것을 따른다. 전사문의 마지막 시간 표시와 크게 다르면 전사문이 일부만 담긴 것으로 보고, rationale에 그 점을 밝힌다. ② 실제 시간이 없으면 전사문의 시간 표시(예: [03:05])를 근거로 쓴다. ③ 시간 표시도 없으면 글의 분량으로 길이를 추측하지 않는다. 이때는 단계별 시간 배분과 정리 유무만 본다.
11. 멘토는 수업 대상을 미리 알고 들어간다. 학년을 묻지 않은 것은 감점 사유가 아니다. 설명·용어·예시의 수준은 '수업 정보'의 대상을 기준으로 판단한다. 예: 중학생 대상인데 '역학', '미분' 같은 용어를 풀어 주지 않고 쓰면 설명의 적절성과 학생 파악과 맞춤을 낮게 본다. 대상 정보가 없으면 수준이 맞았는지 단정하지 말고, rationale에 "대상 정보가 없어 수준 적합성은 판단하지 않았다"고 밝힌다.
12. '학과 공통 자료'가 주어지면 전공·진로 정보의 정확성은 그 자료를 기준으로 판단한다. 자료와 어긋나는 말은 감점하고, rationale에 자료의 어느 내용과 다른지 쓴다. '학교마다 다른 것'에 해당하는 말(예: 전공 선택 시기, 학년별 과목)은 자료와 달라도 틀렸다고 하지 않는다. 대신 학교마다 다르다는 점이나 확인 방법을 안내했는지를 본다. 진로 연결과 실천 안내의 next_action을 쓸 때는 자료의 관련 고교 과목·진로 탐색 활동 중 대상에게 맞는 것을 구체적으로 골라 쓴다. 학과 자료가 없으면 일반 지식으로 판단하되 확신이 없는 사실은 단정하지 않는다.
13. '평가 장면'이 모의 시연이면 학생 발화는 선배·동료가 학생 역할을 한 것이다. 실제 학생 반응처럼 다루되, 역할극이라 반응이 적은 것을 멘토 탓으로 돌리지 않는다.
14. '수업 계획'이 주어지면 수업 구조는 계획 대비 실행으로 판단한다. 계획한 순서와 시간대로 진행했는지, 달라졌다면 학생 반응에 맞춘 이유 있는 조정인지를 rationale에 쓴다. 계획이 없으면 일반적인 흐름(목표 제시 → 내용 → 확인 → 정리)으로 판단한다.
15. '발표 자료'가 주어지면 발표 자료(PPT) 항목을 채점한다. PDF가 첨부되면 슬라이드 화면을 직접 보고 글자 양, 장마다 핵심 메시지, 시각자료, 대상 눈높이를 본다. PPTX 글자만 주어지면 글자 양·장별 핵심·구성만 보고, 시각자료와 가독성은 볼 수 없다고 rationale에 밝힌다. 근거(evidence)에는 전사문 발화를 쓰고, 자료 내용은 rationale에 "[3장]"처럼 장 번호로 가리킨다. 말과 자료가 잘 연결되는지(설명하는 장과 말하는 내용이 맞는지)도 본다. 자료의 사실 내용은 전공·진로 정보의 정확성 판단에도 쓴다. 발표 자료가 없으면 이 항목은 NA다.`;

export function buildUserPrompt(opts: {
  template: Template;
  presenter: string;
  topic: string | null;
  transcript: string;
  plannedMinutes?: number | null;
  actualMinutes?: number | null;
  audience?: string | null;
  majorText?: string | null;
  sceneLabel?: string | null;
  lessonPlan?: string | null;
  materialText?: string | null;
}) {
  const items = opts.template.items.filter((i): i is ScoredItem => i.kind === "score");
  const rubricText = items
    .map(
      (i) =>
        `[${i.id}] ${i.title}\n질문: ${i.question}\n` +
        i.levels.map((l, n) => `  ${n + 1}점: ${l}`).join("\n") +
        (i.anchors?.length ? "\n  판단 기준 예시(앵커, 기준 문장보다 우선):\n" + i.anchors.map((a) => `  - ${a}`).join("\n") : "")
    )
    .join("\n\n");

  return `## 수업 정보
- 평가지: ${opts.template.name}
- 수업한 사람: ${opts.presenter}
- 전공·주제: ${opts.topic ?? "(없음)"}
- 수업 대상: ${opts.audience ?? "(입력 안 됨)"}
- 평가 장면: ${opts.sceneLabel ?? "모의 시연"}
- 수업 계획: ${opts.lessonPlan ? "\n" + opts.lessonPlan.split("\n").map((l) => "    " + l).join("\n") : "(제출 안 함)"}
- 계획 시간: ${opts.plannedMinutes ? `${opts.plannedMinutes}분` : "(입력 안 됨)"}
- 실제 수업 시간: ${opts.actualMinutes ? `${opts.actualMinutes}분` : "(입력 안 됨)"}

${opts.majorText ? opts.majorText + "\n\n" : ""}${opts.materialText ? opts.materialText + "\n\n" : ""}## 평가 항목 (모든 항목을 빠짐없이 채점)
${rubricText}

## 전사문
<transcript>
${opts.transcript}
</transcript>`;
}

// Claude가 꼭 이 모양으로 답하도록 하는 JSON 형식
export function outputSchema(itemIds: string[]) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["items", "strengths", "improvements"],
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["item_id", "score", "evidence", "rationale", "next_action"],
          properties: {
            item_id: { type: "string", enum: itemIds },
            score: { type: "string", enum: ["1", "2", "3", "4", "NA"] },
            evidence: { type: "array", items: { type: "string" } },
            rationale: { type: "string" },
            next_action: { type: "string" },
          },
        },
      },
      strengths: { type: "array", items: { type: "string" } },
      improvements: { type: "array", items: { type: "string" } },
    },
  };
}

export type AiOutput = {
  items: { item_id: string; score: string; evidence: string[]; rationale: string; next_action: string }[];
  strengths: string[];
  improvements: string[];
};

// 근거 인용이 전사문에 실제로 있는지 확인 (띄어쓰기·문장부호·시간 표시 차이는 무시)
const norm = (s: string) =>
  s
    .replace(/\[?\d{1,2}:\d{2}(:\d{2})?\]?/g, "")
    .replace(/[\s"'“”‘’.,!?~…·\-–—()[\]{}:;]/g, "")
    .toLowerCase();

export function verifyQuote(quote: string, transcript: string) {
  const hay = norm(transcript);
  // "앞부분 ... 뒷부분"처럼 생략한 인용은 조각마다 확인
  const parts = quote.split(/\.\.\.|…/).map(norm).filter((p) => p.length >= 4);
  if (parts.length === 0) return false;
  return parts.every((p) => hay.includes(p));
}

// ── 수동 모드: API 없이 claude.ai에 붙여 넣어 채점할 때 ──

// claude.ai에 붙여 넣을 요청문 (시스템 지시 + 평가지 + 전사문 + 답변 형식)
export function buildManualPrompt(opts: Parameters<typeof buildUserPrompt>[0]) {
  const ids = opts.template.items.filter((i) => i.kind === "score").map((i) => i.id);
  return `${SYSTEM_PROMPT}

${buildUserPrompt(opts)}

## 답변 형식 (아주 중요)
다른 말 없이 아래 모양의 JSON 하나만 출력해. 코드 블록 표시도 하지 마.
- items에는 다음 item_id를 모두 한 번씩 넣어: ${ids.join(", ")}
- score는 "1", "2", "3", "4", "NA" 중 하나 (문자열)

{
  "items": [
    { "item_id": "${ids[0] ?? "structure"}", "score": "3", "evidence": ["전사문에서 그대로 옮긴 발화"], "rationale": "이유", "next_action": "다음에 할 행동" }
  ],
  "strengths": ["잘한 점"],
  "improvements": ["개선할 점"]
}`;
}

// claude.ai에서 받은 답을 읽기 (앞뒤 설명이나 코드 블록이 섞여 있어도 JSON 부분만 꺼내요)
export function parseAiOutput(text: string, itemIds: string[]): AiOutput {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("JSON을 찾지 못했어요. Claude의 답 전체를 복사해 주세요.");
  const raw = JSON.parse(text.slice(start, end + 1));

  if (!Array.isArray(raw.items)) throw new Error('"items" 목록이 없어요.');
  const items = (raw.items as Record<string, unknown>[]).map((it) => {
    const score = String(it.score ?? "").trim().toUpperCase();
    if (!["1", "2", "3", "4", "NA"].includes(score)) throw new Error(`점수 형식이 이상해요: ${it.item_id} = ${it.score}`);
    return {
      item_id: String(it.item_id),
      score,
      evidence: Array.isArray(it.evidence) ? it.evidence.map(String) : [],
      rationale: String(it.rationale ?? ""),
      next_action: String(it.next_action ?? ""),
    };
  });
  const missing = itemIds.filter((id) => !items.some((i) => i.item_id === id));
  if (missing.length > 0) throw new Error(`빠진 항목이 있어요: ${missing.join(", ")}`);

  return {
    items: items.filter((i) => itemIds.includes(i.item_id)),
    strengths: Array.isArray(raw.strengths) ? raw.strengths.map(String) : [],
    improvements: Array.isArray(raw.improvements) ? raw.improvements.map(String) : [],
  };
}
