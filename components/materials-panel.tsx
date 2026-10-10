"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { MATERIAL_MAX_BYTES, isPdf, type MaterialRow } from "@/lib/materials";

// 발표 자료(PPT) 올리기와 AI가 읽은 내용 확인
export default function MaterialsPanel({ sessionId, onChange }: { sessionId: string; onChange?: () => void }) {
  const [rows, setRows] = useState<MaterialRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [reload, setReload] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase
      .from("materials")
      .select("id, file_name, mime, size_bytes, storage_path, page_count, extract_status, extracted, created_at")
      .eq("session_id", sessionId).order("created_at", { ascending: false })
      .then(({ data }) => setRows((data as MaterialRow[]) ?? []));
  }, [sessionId, reload]);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);

  async function upload(file: File) {
    if (file.size > MATERIAL_MAX_BYTES) return alert("파일이 20MB보다 커요.");
    setBusy(true);
    setElapsed(0);
    const { data } = await supabase.auth.getSession();
    const form = new FormData();
    form.append("sessionId", sessionId);
    form.append("file", file);
    const res = await fetch("/api/materials", {
      method: "POST",
      headers: { authorization: `Bearer ${data.session?.access_token ?? ""}` },
      body: form,
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (input.current) input.current.value = "";
    if (!res.ok) return alert(body.error ?? "올리기 실패");
    if (body.status === "failed") alert("파일은 저장했지만 내용을 읽지 못했어요: " + body.note);
    setReload((k) => k + 1);
    onChange?.();
  }

  const latest = rows?.[0] ?? null;

  return (
    <div className="space-y-2 rounded-md border p-3 text-sm">
      <p><b>발표 자료 (PPT)</b></p>
      <div className="space-y-1 rounded-md bg-muted p-2 text-xs">
        <p><b>PDF로 올려 주세요 (권장).</b> PowerPoint: 파일 → 내보내기 → PDF / 구글 슬라이드·키노트: PDF로 다운로드.</p>
        <p>PDF는 AI가 <b>슬라이드 화면을 그대로</b> 봐요. 글자 양, 그림, 배치, 가독성까지 평가해요.</p>
        <p>PPTX도 올릴 수 있지만 <b>글자와 발표자 노트만</b> 읽어요. 그림·배치·글자 크기는 못 봐요. 예전 .ppt·키노트 파일은 PDF로 바꿔 주세요.</p>
      </div>

      <input ref={input} type="file" accept=".pdf,.pptx,application/pdf" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
      <Button size="sm" className="w-full" variant={latest ? "outline" : "default"} disabled={busy}
        onClick={() => input.current?.click()}>
        {busy ? `올리고 읽는 중... ${elapsed}초` : latest ? "새 자료 올리기" : "발표 자료 올리기 (PDF 권장)"}
      </Button>

      {rows && rows.length > 0 && (
        <ul className="space-y-1.5">
          {rows.map((r, i) => {
            const slides = r.extracted?.slides ?? [];
            return (
              <li key={r.id} className="rounded-md border p-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{r.file_name}{i === 0 && <span className="ml-1 text-xs text-primary">AI 채점에 사용</span>}</p>
                    <p className="text-xs text-muted-foreground">
                      {isPdf(r) ? "PDF · 화면까지 분석" : "PPTX · 글자만 분석"} · {r.page_count ?? "?"}장 ·{" "}
                      {(r.size_bytes / 1024 / 1024).toFixed(1)}MB · {r.created_at.slice(0, 16).replace("T", " ")}
                      {r.extract_status === "failed" && " · ⚠ 내용 읽기 실패"}
                    </p>
                  </div>
                  {slides.length > 0 && (
                    <button className="shrink-0 text-xs underline" onClick={() => setOpen(open === r.id ? null : r.id)}>
                      {open === r.id ? "접기" : "AI가 읽은 내용"}
                    </button>
                  )}
                </div>
                {open === r.id && (
                  <div className="mt-2 max-h-80 space-y-2 overflow-y-auto text-xs">
                    {slides.map((s) => (
                      <div key={s.n} className="rounded bg-muted p-2">
                        <p className="font-medium">{s.n}장</p>
                        <p className="whitespace-pre-wrap">{s.text || "(글자 없음)"}</p>
                        {s.notes && <p className="mt-1 text-muted-foreground">노트: {s.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">자료를 올린 뒤 AI 채점을 다시 하면 &lsquo;발표 자료(PPT)의 적절성&rsquo;도 채점돼요.</p>
    </div>
  );
}
