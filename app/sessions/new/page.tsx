"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

export default function NewSessionPage() {
  const router = useRouter();
  const [mentorName, setMentorName] = useState("");
  const [major, setMajor] = useState("");
  const [saving, setSaving] = useState(false);

  const canCreate = mentorName.trim() !== "" && !saving;

  async function handleCreate() {
    setSaving(true);
    const { data, error } = await supabase
      .from("sessions")
      .insert({ mentor_name: mentorName.trim(), major: major.trim() || null })
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
        <h1 className="text-xl font-bold">평가받을 시연 등록</h1>
        <p className="text-sm text-muted-foreground">
          발표(시연)하는 멘토를 적어 주세요. 평가하는 선배 이름은 다음 화면에서 각자 입력해요.
        </p>
      </div>
      <Input placeholder="발표하는 멘토 이름" value={mentorName}
        onChange={(e) => setMentorName(e.target.value)} />
      <Input placeholder="소개할 전공 (선택, 예: 기계공학과)" value={major}
        onChange={(e) => setMajor(e.target.value)} />
      <Button className="w-full" disabled={!canCreate} onClick={handleCreate}>
        {saving ? "만드는 중..." : "등록하고 평가 시작"}
      </Button>
    </main>
  );
}