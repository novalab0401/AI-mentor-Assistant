// 멘토 시연(일반 모의수업) 평가지
// - 공통 항목: Nova Lab 공통 루브릭 v1 "강사 루브릭"의 문장을 그대로 써요 (바꾸지 않는 층).
//   모의수업에는 실제 학생이 없어서, 공통 루브릭 적용표에서 ○·△인 항목만 넣었어요.
// - 전공 소개 특화 항목: 초안이에요. 교육공학 담당·운영진 검토 후 확정해야 해요.

export type ScoredItem = {
  id: string;
  kind: "score";
  group: string;
  title: string;
  question: string;
  levels: [string, string, string, string]; // 1~4점 기준
  allowNA?: boolean; // 모의수업에서 판단이 어려울 수 있는 항목(△)
};

export type TextItem = {
  id: string;
  kind: "text";
  group: string;
  title: string;
  placeholder: string;
};

export type RubricItem = ScoredItem | TextItem;

export const rubricVersion = "멘토 시연 v0.2 (공통 루브릭 v1 기반)";

export const rubric: RubricItem[] = [
  // ── 수업 실행 (공통 루브릭) ──
  {
    id: "structure", kind: "score", group: "수업 실행", title: "수업 구조",
    question: "목표에 맞게 구조화하고 단계를 자연스럽게 연결했는가?",
    levels: [
      "목표 없음, 순서 불명확, 계획한 활동 상당 부분 누락",
      "기본 순서는 있으나 일부 단계 생략, 시간 배분 부적절",
      "목표 제시, 설명→활동→확인→정리 흐름 유지, 핵심 활동 대부분 수행",
      "목표-활동-평가가 연결되고, 반응에 따라 순서·시간을 조절, 끝에 목표 달성 확인",
    ],
  },
  {
    id: "explanation", kind: "score", group: "수업 실행", title: "설명의 적절성",
    question: "사전지식·수준을 고려해 정확하고 이해 가능하게 설명했는가?",
    levels: [
      "개념 오류, 설명 없는 전문용어, 이해 못 해도 같은 설명 반복",
      "대체로 정확하나 일방적, 대상 수준과 맞지 않음",
      "정확한 개념 + 예시·비유·시각자료 활용",
      "대상 눈높이에 맞춰 표현·예시를 조절하고, 학생이 자기 말로 설명·적용하게 연결",
    ],
  },
  {
    id: "question", kind: "score", group: "수업 실행", title: "질문의 질",
    question: "목표에 적합하며 사고·참여를 유도하는가?",
    levels: [
      "질문이 거의 없거나 \"맞지?\" 수준",
      "이해·적용 질문 일부, 대부분 정답 확인형",
      "\"왜?\", \"어떻게 알았어?\" 등 근거·방법을 묻고 목표와 연결",
      "답을 바탕으로 후속 질문, 비교→예측→적용으로 확장, 스스로 질문하도록 유도",
    ],
  },
  {
    id: "student_centered", kind: "score", group: "수업 실행", title: "학생 중심성",
    question: "의사결정과 활동이 학생의 학습 과정·반응 중심인가?",
    levels: [
      "강사 설명·시연이 대부분, 학생은 지시만 수행",
      "참여 기회는 있으나 방법·답을 강사가 결정",
      "학생이 수행·질문·선택하고 그 반응이 수업에 반영되도록 설계",
      "학생이 문제 정의·방법 선택·아이디어 발전, 강사는 지원 역할",
    ],
    allowNA: true,
  },
  {
    id: "nonverbal", kind: "score", group: "수업 실행", title: "비언어적 수업 행동",
    question: "시선·표정·제스처·움직임·자세로 참여와 이해를 지원했는가? (관찰 가능한 행동만)",
    levels: [
      "시선·상호작용 매우 제한, 반응 확인 행동 거의 없음",
      "기본 시선·제스처는 있으나 특정 방향·영역에 편중",
      "청중 전체를 고르게 보고, 상황에 맞는 시선·제스처, 필요 시 위치·자세 조절",
      "상황에 따라 능동적으로 조절해 참여·이해를 실질적으로 지원",
    ],
    allowNA: true,
  },
  {
    id: "time", kind: "score", group: "수업 실행", title: "시간 관리와 운영",
    question: "시간 내 핵심 활동을 마치고 운영 원칙을 지켰는가?",
    levels: [
      "핵심 활동 미완료 또는 운영 원칙 위반",
      "시간 부족으로 정리 생략",
      "시간 내 핵심 활동·정리 완료",
      "지연 시 우선순위를 조정해 목표 달성 확인까지 완료",
    ],
  },

  // ── 전공 소개 특화 (초안) ──
  {
    id: "major_accuracy", kind: "score", group: "전공 소개", title: "전공·진로 정보의 정확성",
    question: "전공에서 배우는 내용, 진로, 입시 관련 정보가 정확하고 근거가 있는가?",
    levels: [
      "사실과 다르거나 확인되지 않은 정보를 단정적으로 전달",
      "대체로 맞으나 일부 부정확하거나 개인 경험을 일반화",
      "정확한 정보 전달, 개인 경험과 일반적 사실을 구분",
      "정확한 정보 + 근거 제시, 학교·시기별로 다를 수 있는 정보는 확인 방법까지 안내",
    ],
  },
  {
    id: "material", kind: "score", group: "전공 소개", title: "발표 자료(PPT)의 적절성",
    question: "자료가 핵심 메시지를 대상 눈높이에서 이해하기 쉽게 전달하는가?",
    levels: [
      "글자 과다·가독성 낮음, 말과 자료가 따로 놂",
      "읽을 수는 있으나 장마다 핵심이 잘 드러나지 않음",
      "장마다 핵심 메시지가 드러나고 시각자료가 설명을 도움",
      "대상에 맞는 예시·시각자료로 핵심을 구조화, 자료와 발화가 긴밀히 연결",
    ],
  },

  // ── 종합 의견 (서술) ──
  { id: "comment_material", kind: "text", group: "종합 의견", title: "발표 자료(PPT)에 대한 의견",
    placeholder: "예: 3번 슬라이드 글자가 너무 많아요. 커리큘럼 표는 그림으로 바꾸면 좋겠어요." },
  { id: "comment_content", kind: "text", group: "종합 의견", title: "수업 내용에 대한 의견",
    placeholder: "예: 진로 파트가 대기업 취업에만 치우쳐 있어요. 대학원·창업 사례도 넣으면 좋겠어요." },
  { id: "comment_strength", kind: "text", group: "종합 의견", title: "잘한 점",
    placeholder: "구체적인 장면이나 발화로 적어 주세요." },
  { id: "comment_improve", kind: "text", group: "종합 의견", title: "다음에 바꿀 점",
    placeholder: "멘토가 다음 시연에서 바로 해 볼 수 있는 행동으로 적어 주세요." },
];

export const scoredItems = rubric.filter((i): i is ScoredItem => i.kind === "score");
export const textItems = rubric.filter((i): i is TextItem => i.kind === "text");
export const groups = [...new Set(rubric.map((i) => i.group))];

export function itemTitle(id: string) {
  return rubric.find((i) => i.id === id)?.title ?? id;
}

// 화면 입력값 → DB에 넣을 줄 목록
// scores 값: 1~4 = 점수, null = 평가 불가(N/A)
export type Answers = {
  scores: Record<string, number | null>;
  memos: Record<string, string>;
};

export function isComplete(a: Answers) {
  return scoredItems.every((i) => i.id in a.scores);
}

export function toRows(a: Answers) {
  return rubric
    .map((i) => ({
      item_id: i.id,
      score: i.kind === "score" ? a.scores[i.id] ?? null : null,
      memo: a.memos[i.id]?.trim() || null,
    }))
    // 서술형은 쓴 것만 저장
    .filter((r) => rubric.find((i) => i.id === r.item_id)!.kind === "score" || r.memo !== null);
}
