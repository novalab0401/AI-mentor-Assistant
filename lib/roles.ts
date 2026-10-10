export type Role = "admin" | "evaluator" | "mentor" | "trainee";

export const roleLabels: Record<Role, string> = {
  admin: "운영진",
  evaluator: "선배(평가자)",
  mentor: "멘토",
  trainee: "예비 멘토",
};

export const roles = Object.keys(roleLabels) as Role[];

// 역할마다 할 수 있는 것 (화면 안내용)
export const roleHelp: Record<Role, string> = {
  admin: "가입 승인·초대·역할 변경·위임, 팀 만들기, 수업 등록, 평가 결과 보기 (그룹 삭제는 Nova Lab 승인)",
  evaluator: "수업 목록 보기, 평가하기",
  mentor: "수업 목록 보기, 평가하기, 팀장이 되면 자기 팀 수업 관리",
  trainee: "수업 목록 보기, 평가하기, 팀 신청",
};
