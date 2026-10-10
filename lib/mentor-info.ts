// 멘토 소속: 어느 학교·학과 멘토의 수업인지 남겨야 학과별 자료·평가가 쌓여요 (나중에 학교·학과별 AI 멘토의 바탕)
export const gradeLabels = ["1학년", "2학년", "3학년", "4학년", "5학년 이상", "대학원", "졸업", "기타"];

export type MentorInfo = { university: string | null; department: string | null; grade_label?: string | null };

export const describeMentor = (m: Partial<MentorInfo> | null | undefined) =>
  [m?.university, m?.department, m?.grade_label].filter(Boolean).join(" · ") || null;
