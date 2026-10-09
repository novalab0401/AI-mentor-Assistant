export type Role = "admin" | "evaluator" | "mentor" | "trainee";

export const roleLabels: Record<Role, string> = {
  admin: "운영진",
  evaluator: "선배(평가자)",
  mentor: "멘토",
  trainee: "예비 멘토",
};

export const roles = Object.keys(roleLabels) as Role[];
