"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import TemplatePicker from "@/components/template-picker";
import { supabase } from "@/lib/supabase";
import { getTemplate } from "@/lib/rubric";

type Row = {
  id: string;
  session_no: number;
  mentor_name: string;
  major: string | null;
  session_date: string;
  rubric_type: string;
  evaluations: { evaluator_name: string }[];
};

// 수정 중인 시연의 임시 값
type Draft = { id: string; mentorName: string; major: string; rubricType: string; locked: boolean };

// 그룹 안의 수업(시연) 목록. 운영진만 수정·삭제·결과 보기가 가능해요.
export default function SessionList({ groupId, isAdmin }: { groupId: string; isAdmin: boolean }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase
      .from("sessions")
      .select("id, session_no, mentor_name, major, session_date, rubric_type, evaluations(evaluator_name)")
      .eq("group_id", groupId)
      .order("session_no", { ascending: false })
      .then(({ data, error }) => {
        if (error) alert("불러오기 실패: " + error.message);
        setRows(data ?? []);
      });
  }, [groupId, reloadKey]);

  async function saveEdit() {
    if (!draft || draft.mentorName.trim() === "") return;
    setBusy(true);
    const { data, error } = await supabase
      .from("sessions")
      .update({
        mentor_name: draft.mentorName.trim(),
        major: draft.major.trim() || null,
        rubric_type: draft.rubricType,
      })
      .eq("id", draft.id)
      .select("id");
    setBusy(false);

    if (error) return alert("수정 실패: " + error.message);
    if ((data ?? []).length === 0)
      return alert("수정 권한이 없어요. Supabase에서 시연 수정 허용 SQL을 실행했는지 확인해 주세요.");
    setDraft(null);
    setReloadKey((k) => k + 1);
  }

  async function remove(s: Row) {
    const msg =
      s.evaluations.length > 0
        ? `시연 #${s.session_no} (${s.mentor_name})과 그 평가 ${new Set(s.evaluations.map((e) => e.evaluator_name)).size}명분을 모두 삭제할까요? 되돌릴 수 없어요.`
        : `시연 #${s.session_no} (${s.mentor_name})을 삭제할까요?`;
    if (!confirm(msg)) return;

    setBusy(true);
    // 점수가 시연을 가리키고 있어서(외래 키), 점수를 먼저 지우고 시연을 지워요
    const ev = await supabase.from("evaluations").delete().eq("session_id", s.id);
    if (ev.error) {
      setBusy(false);
      return alert("평가 삭제 실패: " + ev.error.message);
    }
    const { data, error } = await supabase.from("sessions").delete().eq("id", s.id).select("id");
    setBusy(false);

    if (error) return alert("시연 삭제 실패: " + error.message);
    if ((data ?? []).length === 0)
      return alert("삭제 권한이 없어요. Supabase에서 시연 삭제 허용 SQL을 실행했는지 확인해 주세요.");
    setReloadKey((k) => k + 1);
  }

  if (rows === null) return <p className="text-sm text-muted-foreground">불러오는 중...</p>;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">수업(시연)</h2>
        {isAdmin && (
          <Link href={`/groups/${groupId}/sessions/new`} className="rounded-md border px-3 py-1.5 text-sm">
            + 수업 등록
          </Link>
        )}
      </div>

      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground">아직 등록된 수업(시연)이 없어요.</p>
      )}

      {rows.map((s) => {
        const evaluatorCount = new Set(s.evaluations.map((e) => e.evaluator_name)).size;

        if (draft?.id === s.id) {
          // ── 수정 모드 ──
          return (
            <Card key={s.id}>
              <CardHeader>
                <CardDescription>시연 #{s.session_no} 정보 수정</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder="수업(시연)하는 사람 이름" value={draft.mentorName}
                  onChange={(e) => setDraft({ ...draft, mentorName: e.target.value })} />
                <Input placeholder="전공 또는 수업 주제 (선택)" value={draft.major}
                  onChange={(e) => setDraft({ ...draft, major: e.target.value })} />
                <TemplatePicker
                  value={draft.rubricType}
                  disabled={draft.locked}
                  onChange={(id) => setDraft({ ...draft, rubricType: id })}
                />
                {draft.locked && (
                  <p className="text-xs text-muted-foreground">
                    이미 평가가 있어서 평가지는 바꿀 수 없어요. (항목이 달라져서 점수가 맞지 않게 돼요)
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" disabled={busy} onClick={() => setDraft(null)}>취소</Button>
                  <Button disabled={busy || draft.mentorName.trim() === ""} onClick={saveEdit}>
                    {busy ? "저장 중..." : "저장"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        }

        // ── 보기 모드 ──
        return (
          <Card key={s.id}>
            <CardHeader>
              <CardDescription>시연 #{s.session_no} · {s.session_date}</CardDescription>
              <CardTitle>
                {s.mentor_name}
                {s.major && <span className="font-normal"> · {s.major}</span>}
              </CardTitle>
              <CardDescription>
                {getTemplate(s.rubric_type).name}
                {isAdmin && ` · 평가자 ${evaluatorCount}명`}
              </CardDescription>
            </CardHeader>
            {!isAdmin ? (
              <CardContent>
                <Link href={`/evaluate/${s.id}`}
                  className="block rounded-lg bg-primary py-1.5 text-center text-sm font-medium text-primary-foreground">
                  평가하기
                </Link>
              </CardContent>
            ) : (
            <CardContent className="grid grid-cols-3 gap-2">
              <Link href={`/sessions/${s.id}`}
                className="rounded-lg bg-primary py-1.5 text-center text-sm font-medium text-primary-foreground">
                결과 보기
              </Link>
              <Button variant="outline" disabled={busy || draft !== null}
                onClick={() =>
                  setDraft({
                    id: s.id,
                    mentorName: s.mentor_name,
                    major: s.major ?? "",
                    rubricType: s.rubric_type,
                    locked: s.evaluations.length > 0,
                  })
                }>
                수정
              </Button>
              <Button variant="destructive" disabled={busy || draft !== null} onClick={() => remove(s)}>
                삭제
              </Button>
            </CardContent>
            )}
          </Card>
        );
      })}
    </section>
  );
}
