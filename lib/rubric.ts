// Nova Lab 평가지
// 2층 구조:
//  - 공통 항목(COMMON): Nova Lab 공통 루브릭 v1 "강사 루브릭" 문장을 그대로 써요. 바꾸지 않아요.
//    같은 id면 어느 수업에서든 같은 기준이라, 수업·강사 간 비교가 돼요.
//  - 평가지(templates): 수업 종류 × 평가 장면마다 어떤 공통 항목을 쓸지 + 특화 항목 + 서술형 칸.
//    특화 항목 문장은 초안이에요. 교육공학 담당·운영진 검토 후 확정해야 해요.

export type ScoredItem = {
  id: string;
  kind: "score";
  group: string;
  title: string;
  question: string;
  levels: [string, string, string, string]; // 1~4점 기준
  allowNA?: boolean; // "판단하기 어려움" 허용 (적용표의 △ 항목)
};

export type TextItem = {
  id: string;
  kind: "text";
  group: string;
  title: string;
  placeholder: string;
};

export type RubricItem = ScoredItem | TextItem;

type Common = Omit<ScoredItem, "kind" | "group" | "allowNA">;

// ── 공통 루브릭 v1 강사 항목 (원문) ──
const COMMON: Record<string, Common> = {
  structure: {
    id: "structure", title: "수업 구조",
    question: "목표에 맞게 구조화하고 단계를 자연스럽게 연결했는가?",
    levels: [
      "목표 없음·순서 불명확·계획 활동 상당 부분 누락",
      "기본 순서는 있으나 일부 단계 생략·시간 부적절",
      "목표 제시, 설명→활동→확인→정리 유지, 핵심 활동 대부분 수행",
      "목표-활동-평가 연결, 학생 반응에 따라 순서·시간 능동 조절, 종료 시 목표 달성 확인",
    ],
  },
  explanation: {
    id: "explanation", title: "설명의 적절성",
    question: "사전지식·수준을 고려해 정확하고 이해 가능하게 설명했는가?",
    levels: [
      "개념 오류, 설명 없는 전문용어, 이해 못 해도 같은 설명 반복",
      "대체로 정확하나 일방적, 수준 불일치, 설명 방식을 바꾸지 않음",
      "정확한 개념 + 예시·비유·시각자료, 오답 확인 시 재설명",
      "오개념 확인 후 설명·예시·난이도·표현 즉시 조절, 학생이 자기 언어로 설명·적용하게 연결",
    ],
  },
  question: {
    id: "question", title: "질문의 질",
    question: "목표에 적합하며 사고·참여를 유도하는가?",
    levels: [
      "질문 거의 없음 또는 \"이름이 뭐지?\", \"맞지?\" 수준",
      "이해·적용 질문 일부, 대부분 정답 확인형",
      "\"왜?\", \"어떻게 알았어?\", \"어떤 방법이 좋을까?\" 등 설명·근거·방법 요구, 목표와 연결",
      "학생 답을 바탕으로 후속 질문, 근거→비교→예측→적용→새 해결방법으로 확장, 학생이 스스로 질문·탐색하도록 유도",
    ],
  },
  adjust: {
    id: "adjust", title: "학생 반응에 따른 조절",
    question: "반응을 파악해 수업 방법을 실제로 바꿨는가?",
    levels: [
      "혼란을 표현해도 계획대로 진행, 오답 단순 정정",
      "명시적 질문·오답에만 답함",
      "오개념·이해 부족·높은 이해도를 파악해 설명·질문·힌트·속도 조절",
      "발화·수행·오답을 근거로 전략 변경 후 다시 이해 확인·추가 조절",
    ],
  },
  thinking: {
    id: "thinking", title: "사고 촉진",
    question: "정답 대신 스스로 해결하도록 지원했는가?",
    levels: [
      "정답·해결법을 직접 제공",
      "일부 힌트, 상당 부분 강사가 대신",
      "질문·단서·부분 도움으로 단계적 지원, 다시 수행할 기회",
      "사고 과정 확인 후 최소한의 지원, 여러 방법 비교·가설 검증 유도",
    ],
  },
  feedback: {
    id: "feedback", title: "피드백",
    question: "다음 수행 개선에 실제로 도움이 되는가?",
    levels: [
      "없음 또는 \"맞아/틀렸어\", \"잘했어\"",
      "오류 지적·개선 방향 일부, 원인·다음 행동 부족",
      "잘된 점·개선점 설명 + 다음 행동 제시",
      "오류 원인 설명 + 다음 행동 제시 + 재수행 후 개선 확인",
    ],
  },
  trouble: {
    id: "trouble", title: "문제 상황 대응",
    question: "예상 못 한 상황에서 목적과 학습을 유지했는가?",
    levels: [
      "장비 오류·오답·질문·갈등으로 수업이 장시간 중단되거나 해결 못 함",
      "해결은 하지만 원인을 학습과 연결하지 않고 강사가 직접 처리",
      "원인 파악, 학생에게 적절한 역할 부여, 흐름 유지",
      "예상 밖 오류·질문·결과를 학습 기회로 전환, 학생이 원인 탐색·가설·해결 시도",
    ],
  },
  student_centered: {
    id: "student_centered", title: "학생 중심성",
    question: "의사결정과 활동이 학생의 학습 과정·반응 중심인가?",
    levels: [
      "강사 설명·시연 대부분, 학생은 지시 수행",
      "참여하지만 방법·답을 강사가 결정",
      "학생이 수행·질문·선택하고 반응이 수업에 반영",
      "학생이 문제 정의·방법 선택·아이디어 발전, 강사는 지원 역할",
    ],
  },
  nonverbal: {
    id: "nonverbal", title: "비언어적 수업 행동",
    question: "시선·표정·제스처·움직임·자세로 참여와 이해를 지원했는가? (관찰 가능한 행동만)",
    levels: [
      "시선·상호작용 매우 제한, 반응 확인 행동 거의 없음",
      "기본 시선·제스처는 있으나 특정 학생·영역 편중",
      "학생 전체를 고르게 보고, 상황에 맞는 시선·제스처, 필요 시 위치·자세 조절",
      "반응·상황에 따라 능동 조절, 참여·이해를 실질적으로 지원",
    ],
  },
  error_diagnosis: {
    id: "error_diagnosis", title: "오류 진단 (장비 vs 학습)",
    question: "문제의 원인이 장비·환경인지 학생의 개념·코드·설정인지 구분하고 그에 맞게 대응했는가?",
    levels: [
      "구분 없이 교체·정답 제시",
      "구분은 하나 근거 확인 없이 추측",
      "데이터(값·로그·현상)를 확인하게 해서 구분",
      "학생이 직접 가설을 세워 구분하도록 유도하고, 학습 오류는 학습 기회로 전환",
    ],
  },
  priority: {
    id: "priority", title: "다중 요청 우선순위와 주의 분배",
    question: "여러 학생의 요청에 적절한 우선순위를 두고, 특정 학생에게 관심이 쏠리지 않았는가?",
    levels: [
      "먼저 부른 순, 특정 학생 집중",
      "우선순위 의식은 있으나 다른 학생 방치",
      "안전·진행 막힘 순으로 우선순위, 대기 학생에게 할 일 제시",
      "우선순위 + 학생끼리 돕게 하는 등 전체 흐름 유지, 모든 학생과 고르게 상호작용",
    ],
  },
  time: {
    id: "time", title: "시간 관리와 안전·운영",
    question: "시간 내 핵심 활동을 마치고 안전·운영 원칙을 지켰는가?",
    levels: [
      "핵심 활동 미완료 또는 안전 수칙 위반",
      "시간 부족으로 정리 생략",
      "시간 내 핵심 활동·정리 완료, 안전 수칙 준수",
      "지연 시 우선순위를 조정해 목표 달성 확인까지 완료, 안전 수칙을 학생에게 명시적으로 안내",
    ],
  },
};

const common = (id: keyof typeof COMMON, group: string, allowNA = false): ScoredItem => ({
  ...COMMON[id], kind: "score", group, allowNA,
});

// ── 특화 항목 ──
// 전공 소개 특화 4개(학생 파악·실천 안내·균형·질문 응답)는 2026-10-10 김재호 검토로 채택(양식 A).
// 정확성·PPT와 이공계 항목은 아직 초안이에요.
const studentFit: ScoredItem = {
  id: "student_fit", kind: "score", group: "전공 소개", title: "학생 파악과 맞춤",
  question: "학생의 관심·학년·아는 정도를 확인하고 그에 맞춰 설명을 조절했는가?",
  levels: [
    "학생에 대해 묻지 않고 준비한 내용만 전달",
    "처음에 한 번 물었지만 답을 설명에 반영하지 않음",
    "학생 관심·수준을 확인하고 예시나 강조점을 그에 맞춤",
    "수업 중간에도 반응을 확인하며 학생별 관심에 연결해 설명을 바꿈",
  ],
  allowNA: true, // 학생 역할이 없는 혼자 연습이면 판단 불가
};
const careerAction: ScoredItem = {
  id: "career_action", kind: "score", group: "전공 소개", title: "진로 연결과 실천 안내",
  question: "학생이 \"지금 무엇을 하면 되는지\" 알 수 있게 구체적으로 안내했는가?",
  levels: [
    "진로나 준비 방법을 말하지 않음",
    "\"열심히 하면 돼요\" 같은 일반론만 제시",
    "고등학교 과목·활동·더 알아볼 곳 중 구체적인 것을 안내",
    "학생 관심에 맞춘 다음 행동을 구체적으로 제시하고, 스스로 판단할 기준까지 알려줌",
  ],
};
const balance: ScoredItem = {
  id: "balance", kind: "score", group: "전공 소개", title: "균형과 현실성",
  question: "전공의 좋은 점과 힘든 점을 균형 있게 전달하고 과장·확언을 피했는가?",
  levels: [
    "좋은 점만 강조하거나 \"무조건 취업\" 같은 확언·비하 발언",
    "힘든 점을 언급하지만 가볍게 넘김",
    "좋은 점과 힘든 점을 구체적 경험과 함께 제시",
    "균형 + 이 전공이 맞는 사람과 안 맞는 사람의 특징까지 알려줘 스스로 판단하게 함",
  ],
};
const studentQuestions: ScoredItem = {
  id: "student_questions", kind: "score", group: "전공 소개", title: "학생 질문 응답",
  question: "학생이 질문할 기회를 만들고, 받은 질문에 정확하고 성의 있게 답했는가? (멘토가 묻는 질문은 '질문의 질'에서 봐요)",
  levels: [
    "질문 기회가 없거나 \"질문 있어요? 없으면 마칠게요\"로 끝냄",
    "질문을 받지만 짧거나 동떨어진 답",
    "질문을 충분히 기다려 받고, 질문의 의도에 맞는 구체적인 답을 함",
    "답 후 이해했는지 확인하고, 모르는 것은 모른다고 하며 확인 방법을 안내",
  ],
  allowNA: true, // 학생 역할이 없는 혼자 연습이면 판단 불가
};
const majorAccuracy: ScoredItem = {
  id: "major_accuracy", kind: "score", group: "전공 소개", title: "전공·진로 정보의 정확성",
  question: "전공에서 배우는 내용, 진로, 입시 관련 정보가 정확하고 근거가 있는가?",
  levels: [
    "사실과 다르거나 확인되지 않은 정보를 단정적으로 전달",
    "대체로 맞으나 일부 부정확하거나 개인 경험을 일반화",
    "정확한 정보 전달, 개인 경험과 일반적 사실을 구분",
    "정확한 정보 + 근거 제시, 학교·시기별로 다를 수 있는 정보는 확인 방법까지 안내",
  ],
};
const material: ScoredItem = {
  id: "material", kind: "score", group: "전공 소개", title: "발표 자료(PPT)의 적절성",
  question: "자료가 핵심 메시지를 대상 눈높이에서 이해하기 쉽게 전달하는가?",
  levels: [
    "글자 과다·가독성 낮음, 말과 자료가 따로 놂",
    "읽을 수는 있으나 장마다 핵심이 잘 드러나지 않음",
    "장마다 핵심 메시지가 드러나고 시각자료가 설명을 도움",
    "대상에 맞는 예시·시각자료로 핵심을 구조화, 자료와 발화가 긴밀히 연결",
  ],
};
const conceptAccuracy: ScoredItem = {
  id: "concept_accuracy", kind: "score", group: "이공계 수업 (초안)", title: "핵심 개념의 정확성",
  question: "수업의 핵심 개념(예: PID 제어에서 P·I·D의 역할)을 과학적으로 정확하게 다뤘는가?",
  levels: [
    "핵심 개념을 틀리게 설명하거나 오개념을 그대로 전달",
    "대체로 맞으나 일부 부정확하거나 지나치게 단순화해 오해 여지",
    "핵심 개념을 정확히 설명하고 용어를 일관되게 사용",
    "정확한 설명 + 흔한 오개념을 짚어 바로잡고, 실습 결과와 개념을 연결",
  ],
};
const labGuide: ScoredItem = {
  id: "lab_guide", kind: "score", group: "이공계 수업 (초안)", title: "실습 안내의 명확성",
  question: "학생이 무엇을, 어떤 순서로, 왜 하는지 알 수 있게 실습을 안내했는가?",
  levels: [
    "실습 목표·절차 안내 없이 바로 진행",
    "절차는 안내하나 목표·이유 설명 부족, 또는 안전 안내 누락",
    "목표·절차·안전을 안내하고 예상 결과를 제시",
    "목표·절차·안전 + 막히기 쉬운 지점과 확인 방법까지 안내해 학생이 스스로 진행 가능",
  ],
};

// ── 서술형 ──
const text = (id: string, title: string, placeholder: string): TextItem => ({
  id, kind: "text", group: "종합 의견", title, placeholder,
});
const strength = text("comment_strength", "잘한 점", "구체적인 장면이나 발화로 적어 주세요.");
const improve = text("comment_improve", "다음에 바꿀 점", "다음 수업에서 바로 해 볼 수 있는 행동으로 적어 주세요.");

// ── 평가지 목록 ──
export type Template = {
  id: string;
  name: string;
  description: string;
  items: RubricItem[];
};

const 실행 = "수업 실행 (공통)";

export const templates: Template[] = [
  {
    id: "mentor_mock",
    name: "전공·진로 소개 · 모의 시연",
    description: "멘토가 선배들 앞에서 전공 소개 수업을 시연할 때",
    // 전공 소개는 발표(강의)형이라 "학생 중심성"은 적용하지 않아요. (공통 루브릭 4-2: 유형별 N/A)
    items: [
      common("structure", 실행), common("explanation", 실행), common("question", 실행),
      common("nonverbal", 실행, true), common("time", 실행),
      majorAccuracy, material, studentFit, careerAction, balance, studentQuestions,
      text("comment_material", "발표 자료(PPT)에 대한 의견",
        "예: 3번 슬라이드 글자가 너무 많아요. 커리큘럼 표는 그림으로 바꾸면 좋겠어요."),
      text("comment_content", "수업 내용에 대한 의견",
        "예: 진로 파트가 대기업 취업에만 치우쳐 있어요. 대학원·창업 사례도 넣으면 좋겠어요."),
      strength, improve,
    ],
  },
  {
    id: "stem_mock",
    name: "이공계 실습 수업 · 모의 시연",
    description: "강사가 학생 없이 실습 수업(예: PID)을 시연할 때",
    items: [
      common("structure", 실행), common("explanation", 실행), common("question", 실행),
      common("student_centered", 실행, true), common("nonverbal", 실행, true), common("time", 실행),
      conceptAccuracy, labGuide,
      text("comment_material", "수업 자료에 대한 의견", "슬라이드, 실습지, 코드 예시 등에 대한 의견"),
      text("comment_content", "수업 내용·실습 설계에 대한 의견", "난이도, 활동 순서, 실습 과제 등에 대한 의견"),
      strength, improve,
    ],
  },
  {
    id: "stem_live",
    name: "이공계 실습 수업 · 실제 수업",
    description: "학생이 있는 실제 수업을 참관·평가할 때 (공통 12항목 전체)",
    items: [
      common("structure", 실행), common("explanation", 실행), common("question", 실행),
      common("adjust", 실행), common("thinking", 실행), common("feedback", 실행),
      common("trouble", 실행), common("student_centered", 실행), common("nonverbal", 실행),
      common("error_diagnosis", 실행, true), common("priority", 실행, true), common("time", 실행),
      conceptAccuracy,
      text("comment_content", "수업 내용·실습 설계에 대한 의견", "난이도, 활동 순서, 실습 과제 등에 대한 의견"),
      strength, improve,
    ],
  },
];

export const defaultTemplateId = "mentor_mock";

export function getTemplate(id: string | null | undefined): Template {
  return templates.find((t) => t.id === id) ?? templates[0];
}

export const scoredOf = (items: RubricItem[]) =>
  items.filter((i): i is ScoredItem => i.kind === "score");
export const textOf = (items: RubricItem[]) =>
  items.filter((i): i is TextItem => i.kind === "text");
export const groupsOf = (items: RubricItem[]) => [...new Set(items.map((i) => i.group))];

// 화면 입력값 → DB에 넣을 줄 목록
// scores 값: 1~4 = 점수, null = 판단하기 어려움(N/A, 평균에서 제외)
export type Answers = {
  scores: Record<string, number | null>;
  memos: Record<string, string>;
};

export function isComplete(items: RubricItem[], a: Answers) {
  return scoredOf(items).every((i) => i.id in a.scores);
}

export function toRows(items: RubricItem[], a: Answers) {
  return items
    .map((i) => ({
      item_id: i.id,
      score: i.kind === "score" ? a.scores[i.id] ?? null : null,
      memo: a.memos[i.id]?.trim() || null,
      kind: i.kind,
    }))
    .filter((r) => r.kind === "score" || r.memo !== null) // 서술형은 쓴 것만 저장
    .map(({ kind: _kind, ...row }) => row);
}
