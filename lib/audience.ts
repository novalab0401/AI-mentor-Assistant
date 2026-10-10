// 수업 대상: 누구를 상대로 한 수업인지 (평가자와 AI가 설명 수준을 판단하는 기준)
// 멘토는 들어갈 곳을 미리 알고 수업하므로, 학년을 묻지 않은 것은 감점 사유가 아니에요.

export type Audience = { level: string; note: string; size: string };
export const emptyAudience: Audience = { level: "", note: "", size: "" };

export const audienceLevels = [
  "초등학생", "중1", "중2", "중3", "고1", "고2", "고3", "중·고 섞임", "대학생", "학부모·교사", "기타",
];

// DB 값 → 입력 칸 값
export function audienceFromRow(row: {
  audience_level?: string | null; audience_note?: string | null; audience_size?: number | null;
}): Audience {
  return {
    level: row.audience_level ?? "",
    note: row.audience_note ?? "",
    size: row.audience_size != null ? String(row.audience_size) : "",
  };
}

// 입력 칸 값 → DB 값
export function audienceToRow(a: Audience) {
  const n = Number(a.size);
  return {
    audience_level: a.level.trim() || null,
    audience_note: a.note.trim() || null,
    audience_size: /^\d+$/.test(a.size.trim()) && n > 0 ? n : null,
  };
}

// 한 줄 설명 (화면·AI 프롬프트용). 아무것도 없으면 null
export function describeAudience(row: {
  audience_level?: string | null; audience_note?: string | null; audience_size?: number | null;
}): string | null {
  const parts = [
    row.audience_level,
    row.audience_size ? `${row.audience_size}명` : null,
    row.audience_note,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}
