"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BackLink from "@/components/back-link";
import { supabase } from "@/lib/supabase";
import { gradeLabels } from "@/lib/mentor-info";

type Me = { display_name: string; university: string | null; department: string | null; grade_label: string | null };

// 내 정보: 이름과 소속(대학·학과·학년)
export default function MePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      setUid(auth.user.id);
      const { data } = await supabase
        .from("profiles").select("display_name, university, department, grade_label").eq("id", auth.user.id).single();
      setMe((data as Me) ?? { display_name: "", university: null, department: null, grade_label: null });
    })();
  }, []);

  async function save() {
    if (!me || !uid) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("profiles")
      .update({
        display_name: me.display_name.trim(),
        university: me.university?.trim() || null,
        department: me.department?.trim() || null,
        grade_label: me.grade_label || null,
      })
      .eq("id", uid)
      .select("id");
    setBusy(false);
    if (error || !data?.length) return alert("저장 실패: " + (error?.message ?? "권한이 없어요"));
    setSaved(true);
  }

  if (!me) return <main className="p-4">불러오는 중...</main>;
  const set = (patch: Partial<Me>) => { setMe({ ...me, ...patch }); setSaved(false); };

  return (
    <main className="mx-auto max-w-md space-y-4 p-4">
      <BackLink href="/" label="홈" />
      <div>
        <h1 className="text-xl font-bold">내 정보</h1>
        <p className="text-sm text-muted-foreground">
          소속을 적어 두면 수업을 등록할 때 자동으로 들어가요. 같은 학교·학과 멘토들의 자료와 평가가 모여 학과별 기준과 AI 멘토를 만드는 바탕이 돼요.
        </p>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">이름</p>
        <Input value={me.display_name} onChange={(e) => set({ display_name: e.target.value })} />
        <p className="pt-2 text-sm font-medium">대학교</p>
        <Input placeholder="예: UNIST" value={me.university ?? ""} onChange={(e) => set({ university: e.target.value })} />
        <p className="pt-2 text-sm font-medium">학과(전공)</p>
        <Input placeholder="예: 기계공학과" value={me.department ?? ""} onChange={(e) => set({ department: e.target.value })} />
        <p className="pt-2 text-sm font-medium">학년</p>
        <select className="w-full rounded-md border bg-background px-2 py-2 text-sm"
          value={me.grade_label ?? ""} onChange={(e) => set({ grade_label: e.target.value })}>
          <option value="">선택 안 함</option>
          {gradeLabels.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>
      <Button className="w-full" disabled={busy || !me.display_name.trim()} onClick={save}>
        {busy ? "저장 중..." : saved ? "저장됨 ✓" : "저장"}
      </Button>
    </main>
  );
}
