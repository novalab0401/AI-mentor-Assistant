// 발표 자료: 형식 안내, 크기 제한, AI에게 줄 글자 만들기 (화면·서버 공용)

export const MATERIAL_MAX_BYTES = 20 * 1024 * 1024; // 20MB
export const PDF_MIME = "application/pdf";
export const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

export type MaterialRow = {
  id: number; file_name: string; mime: string; size_bytes: number; storage_path: string;
  page_count: number | null; extract_status: "ok" | "failed" | "none";
  extracted: { slides: { n: number; text: string; notes?: string }[] } | null;
  created_at: string;
};

export const isPdf = (m: { mime: string }) => m.mime === PDF_MIME;

// AI 채점 프롬프트에 넣을 글자 (PPTX는 이게 전부, PDF는 파일 자체를 함께 보내고 이건 보조)
export function materialPromptText(m: MaterialRow) {
  const slides = m.extracted?.slides ?? [];
  const head = isPdf(m)
    ? `## 발표 자료 (PDF ${m.page_count ?? slides.length}장, 첨부 문서로 함께 보냄 — 슬라이드 화면을 직접 보고 판단)`
    : `## 발표 자료 (PPTX에서 뽑은 글자 ${slides.length}장 — 그림·배치·글자 크기는 볼 수 없음)`;
  const body = slides
    .map((s) => `[${s.n}장]\n${s.text || "(글자 없음)"}${s.notes ? `\n(발표자 노트) ${s.notes}` : ""}`)
    .join("\n\n");
  return `${head}\n${body}`;
}
