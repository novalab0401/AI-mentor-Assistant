// 학과 자료 (양식 C) — AI가 "전공·진로 정보의 정확성", "진로 연결과 실천 안내"를 판단할 때 참고해요.
//
// 3층 구조:
//  ① 국가 공통: 커리어넷(한국직업능력연구원 국가진로교육연구센터, 교육부 지원) 학과정보 — 지금 여기
//  ② 학교별: 각 대학 학과 홈페이지 (같은 학과라도 학교마다 다른 것: 교육과정, 전공 선택 시기 등) — 나중
//  ③ 현장 경험: 흔한 오해, 자주 묻는 질문, 잘 통하는 비유 (김재호·선배 멘토) — 나중
//
// 커리어넷 원문을 그대로 옮기지 않고 사실 위주로 요약했어요. 출처를 함께 남겨요.

export type MajorProfile = {
  id: string;
  name: string;
  aliases: string[]; // 수업 등록 때 적는 이름과 맞춰 보는 데 써요
  source: { label: string; url: string; updated: string };
  summary: string;
  fit: string; // 흥미와 적성
  highSchool: { curriculum: string; subjects: string[]; source: string }[];
  activities: string[]; // 고등학생 진로 탐색 활동
  universityCourses: { name: string; what: string }[];
  careers: { jobs: string[]; fields: string[] };
  stats: string[]; // 연도·출처가 붙은 수치
  schoolDependent: string[]; // 학교마다 달라서 단정하면 안 되는 것
};

export const majors: MajorProfile[] = [
  {
    id: "mechanical",
    name: "기계공학과",
    aliases: ["기계공학", "기계공학부", "기계공학전공", "기계"],
    source: {
      label: "커리어넷 학과정보 · 기계공학과",
      url: "https://www.career.go.kr/cloud/w/major/uView?seq=86",
      updated: "학과개요 최종수정 2020-12-02, 통계 2023~2025 (2026-10-10 확인)",
    },
    summary:
      "기계에 관한 지식과 실습으로 일상생활의 기계와, 기계를 이용한 설비·장치를 개발하는 방법을 배운다. 기계 설계·제작, 재료, 열역학 등 기계공학 전반을 다룬다(설계 중심인 기계설계공학과와 구분). 자동화 생산설비, 로봇, 자율주행 자동차·선박 등 대부분의 산업에서 쓰인다.",
    fit:
      "기계장치·자동차·전기·전자 등 기술에 관심이 있으면 유리. 기본이 되는 수학과 물리, 작동 원리에 대한 논리력, 도면을 입체로 떠올리는 공간지각력이 도움이 된다.",
    highSchool: [
      {
        curriculum: "2022 개정 교육과정 (현재 고등학생)",
        subjects: [
          "일반 선택: 대수, 미적분Ⅰ, 확률과 통계, 물리학, 화학, 생명과학, 정보, 기술·가정",
          "진로 선택: 기하, 미적분Ⅱ, 역학과 에너지, 전자기와 양자, 물질과 에너지, 화학 반응의 세계, 인공지능 기초, 데이터 과학, 로봇과 공학세계",
          "융합 선택: 창의 공학 설계, 소프트웨어와 생활",
        ],
        source: "서울특별시교육청교육연구정보원, 2022 개정 교육과정 선택 과목 안내서 (커리어넷 재인용)",
      },
      {
        curriculum: "2015 개정 교육과정",
        subjects: [
          "일반 선택: 수학Ⅰ·Ⅱ, 미적분, 확률과 통계, 물리학Ⅰ, 화학Ⅰ, 기술·가정, 정보",
          "진로 선택: 기하, 물리학Ⅱ, 화학Ⅱ, 공학 일반",
        ],
        source: "세종특별자치시교육청, 보인다 시리즈 5.0 (커리어넷 재인용)",
      },
    ],
    activities: [
      "기계 만들기 키트로 직접 만들어 보며 작동 원리 이해",
      "기계 분야 잡지 읽기",
      "기계 원리·제작 영상 보기",
      "한국국제기계박람회 등 기계 분야 박람회 참여",
    ],
    universityCourses: [
      { name: "열역학", what: "열과 에너지의 관계, 엔진·냉동기·압축기 같은 기초 공학 문제" },
      { name: "재료역학", what: "재료가 당겨지고 눌리고 비틀릴 때의 힘과 변형, 재료의 강도" },
      { name: "유체역학", what: "액체·기체의 흐름(층류와 난류), 유체의 힘" },
      { name: "기계공작법", what: "재료를 깎고 잘라 부품을 만드는 방법" },
      { name: "기계공학실험", what: "측정 장비 사용, 온도·압력·유량 측정" },
    ],
    careers: {
      jobs: [
        "기계공학기술자·연구원", "자동차공학기술자", "로봇공학자·로봇연구원", "항공우주공학자",
        "무인자동차엔지니어", "무인항공기시스템개발자", "의료기기개발전문가", "플랜트기계공학기술자",
        "메카트로닉공학기술자", "이공학계열 교수",
      ],
      fields: [
        "기업: 기계 분야 대기업, 건설, 선박·해양 관련 회사",
        "연구기관: 한국기계연구원 등 공공·민간 연구기관",
        "공공: 기계직 공무원, 한국수력원자력·한국전력공사 등 공공기관",
      ],
    },
    stats: [
      "취업률 72.8%, 진학률 11.2% (한국교육개발원 취업통계 2023, 전국 기계공학 계열)",
      "입학자 성비 남 85% / 여 15% (한국교육개발원 교육통계 2025)",
      "졸업 후 첫 직업: 연구직·공학기술직 50.5%, 경영·사무 24.4%, 설치·정비·생산 13.8% (한국고용정보원 2020)",
    ],
    schoolDependent: [
      "전공 선택 시기(입학 때 vs 1년 뒤)와 입학 방식",
      "학년별 교육과정과 과목 이름 (예: '4대 역학'의 구성과 배우는 학년)",
      "졸업생 진로 비율 (전국 통계와 학교별 통계가 다름)",
    ],
  },
];

// 수업 등록 때 적은 전공 이름으로 학과 자료 찾기 (없으면 null)
export function findMajor(text: string | null | undefined): MajorProfile | null {
  if (!text) return null;
  const t = text.replace(/\s/g, "");
  return (
    majors.find((m) => t.includes(m.name.replace(/\s/g, ""))) ??
    majors.find((m) => m.aliases.some((a) => t.includes(a))) ??
    null
  );
}

// AI 프롬프트에 넣을 학과 자료
export function majorPromptText(m: MajorProfile) {
  return `## 학과 공통 자료: ${m.name} (출처: ${m.source.label}, ${m.source.updated})
이 자료는 국가 공통 기준이에요. 학교마다 다를 수 있는 것은 따로 표시했어요.

- 개요: ${m.summary}
- 흥미와 적성: ${m.fit}
- 대학 주요 과목: ${m.universityCourses.map((c) => `${c.name}(${c.what})`).join(", ")}
- 관련 고교 과목:
${m.highSchool.map((h) => `  [${h.curriculum}]\n${h.subjects.map((s) => `   - ${s}`).join("\n")}`).join("\n")}
- 고등학생 진로 탐색 활동: ${m.activities.join(" / ")}
- 관련 직업: ${m.careers.jobs.join(", ")}
- 졸업 후 진출 분야: ${m.careers.fields.join(" / ")}
- 통계: ${m.stats.join(" / ")}
- 학교마다 다른 것(단정하면 안 됨): ${m.schoolDependent.join(" / ")}`;
}
