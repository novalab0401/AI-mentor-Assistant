// 수업 계획 사전 검토: 수업 전에 멘토가 낸 계획(순서·시간)이 적절한지 AI가 봐요.
// 수업 후 "수업 구조" 채점은 계획대로 했는지(실행)를, 여기서는 계획 자체(설계)를 봐요. (2026-10-10 김재호)

export const PLAN_PROMPT_VERSION = "plan-v1-2026-10-10";

export const PLAN_SYSTEM_PROMPT = `너는 Nova Lab의 수업 설계 검토 보조 AI다. 대학생 멘토가 고등학생·중학생에게 할 전공·진로 소개(또는 수업)의 계획을, 수업하기 전에 검토한다.

원칙:
1. 전공·진로 소개의 핵심 단계가 들어 있는지 본다: 도입과 목표 제시, 학과에서 배우는 것(대상 수준에 맞는 예시), 진로(졸업 후 진출), 학생이 지금 할 수 있는 실천 안내(고교 과목·활동), 질문과 정리(목표 확인). 빠진 단계는 "빠짐"으로 표시한다.
2. 순서가 자연스러운지 본다. 다만 정답 순서는 하나가 아니다. 멘토가 의도를 가지고 다르게 배치했다면 존중한다.
3. 시간 배분을 본다. 전체 시간 안에 들어가는지, 질문·정리 시간이 남아 있는지, 한 단계에 시간이 몰리지 않는지.
4. 대상(학년·사전지식)에 맞는 내용인지 본다. 대상보다 어려운 용어를 풀 계획이 있는지 본다.
5. 학과 자료가 주어지면 계획의 사실 내용이 자료와 맞는지 본다. 학교마다 다른 것은 틀렸다고 하지 않는다.
6. 강의형이면 학생 활동이 없어도 괜찮다. 대신 중간 질문·확인 계획이 있는지 본다. 활동이 있으면 좋게 평가한다.
7. 칭찬할 것은 구체적으로, 고칠 것은 바로 고칠 수 있는 문장으로 쓴다. 모든 글은 한국어로 쓴다.
8. suggested_plan에는 멘토의 계획을 최대한 살려 다듬은 계획을 "1. 단계 (n분): 내용" 형식으로 쓴다.`;

export function planOutputSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["verdict", "checks", "suggested_plan", "tips"],
    properties: {
      verdict: { type: "string" },
      checks: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["aspect", "status", "comment"],
          properties: {
            aspect: { type: "string", enum: ["핵심 단계", "순서", "시간 배분", "대상 수준", "내용 정확성", "학생 참여"] },
            status: { type: "string", enum: ["좋음", "보완", "빠짐"] },
            comment: { type: "string" },
          },
        },
      },
      suggested_plan: { type: "string" },
      tips: { type: "array", items: { type: "string" } },
    },
  };
}

export type PlanReview = {
  verdict: string;
  checks: { aspect: string; status: "좋음" | "보완" | "빠짐"; comment: string }[];
  suggested_plan: string;
  tips: string[];
};

export function buildPlanPrompt(opts: {
  templateName: string;
  topic: string | null;
  audience: string | null;
  sceneLabel: string;
  plannedMinutes?: number | null;
  plan: string;
  majorText?: string | null;
}) {
  return `## 수업 정보
- 평가지: ${opts.templateName}
- 전공·주제: ${opts.topic ?? "(없음)"}
- 대상: ${opts.audience ?? "(입력 안 됨)"}
- 장면: ${opts.sceneLabel}
- 계획 시간: ${opts.plannedMinutes ? `${opts.plannedMinutes}분` : "(입력 안 됨, 계획 안의 시간 합으로 판단)"}

${opts.majorText ? opts.majorText + "\n\n" : ""}## 멘토의 수업 계획
<plan>
${opts.plan}
</plan>

검토 항목(checks)은 핵심 단계, 순서, 시간 배분, 대상 수준을 꼭 넣고, 학과 자료가 있으면 내용 정확성, 그리고 학생 참여를 넣어라. verdict는 한두 문장으로 전체 평가를 쓴다.`;
}
