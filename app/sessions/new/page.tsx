"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TemplatePicker from "@/components/template-picker";
import { supabase } from "@/lib/supabase";
import { defaultTemplateId } from "@/lib/rubric";

export default function NewSessionPage() {
  const router = useRouter();
  const [rubricType, setRubricType] = useState(defaultTemplateId);
  const [mentorName, setMentorName] = useState("");
  const [major, setMajor] = useState("");
  const [saving, setSaving] = useState(false);

  const isMentor = rubricType.startsWith("mentor");
  const canCreate = mentorName.trim() !== "" && !saving;

  async function handleCreate() {
    setSaving(true);
    const { data, error } = await supabase
      .from("sessions")
      .insert({
        mentor_name: mentorName.trim(),
        major: major.trim() || null,
        rubric_type: rubricType,
      })
      .select("id")
      .single();

    if (error) {
      setSaving(false);
      alert("생성 실패: " + error.message);
      return;
    }
    router.push(`/evaluate/${data.id}`);
  }

  return (
    <main className="mx-auto max-w-md space-y-4 p-4">
      <div>
        <h1 className="text-xl font-bold">평가받을 수업 등록</h1>
        <p className="text-sm text-muted-foreground">
          수업(시연)하는 사람을 적어 주세요. 평가하는 사람 이름은 평가 화면에서 각자 입력해요.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">1. 평가지 고르기</p>
        <TemplatePicker value={rubricType} onChange={setRubricType} />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">2. 수업 정보</p>
        <Input placeholder={isMentor ? "발표하는 멘토 이름" : "수업하는 강사 이름"} value={mentorName}
          onChange={(e) => setMentorName(e.target.value)} />
        <Input
          placeholder={isMentor ? "소개할 전공 (선택, 예: 기계공학과)" : "수업 주제 (선택, 예: PID 3차시 P 제어)"}
          value={major}
          onChange={(e) => setMajor(e.target.value)}
        />
      </div>

      <Button className="w-full" disabled={!canCreate} onClick={handleCreate}>
        {saving ? "만드는 중..." : "등록하고 평가 시작"}
      </Button>
    </main>
  );
}
