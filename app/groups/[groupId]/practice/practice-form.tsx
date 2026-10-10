"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BackLink from "@/components/back-link";
import TemplatePicker from "@/components/template-picker";
import { supabase } from "@/lib/supabase";
import { defaultTemplateId } from "@/lib/rubric";

// 멤버가 자기 수업을 직접 만들어 AI 평가로 연습하는 화면
export default function PracticeForm() {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();
  const [rubricType, setRubricType] = useState(defaultTemplateId);
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user!.id;
    const { data: me } = await supabase.from("profiles").select("display_name").eq("id", uid).single();
    const { data, error } = await supabase
      .from("sessions")
      .insert({
        group_id: groupId,
        presenter_id: uid,
        mentor_name: me?.display_name ?? "나",
        major: topic.trim() || null,
        rubric_type: rubricType,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error) return alert("만들기 실패: " + error.message);
    router.push(`/sessions/${data.id}/ai`);
  }

  return (
    <main className="mx-auto max-w-md space-y-4 p-4">
      <BackLink href={`/groups/${groupId}`} label="그룹" />
      <div>
        <h1 className="text-xl font-bold">내 수업 AI로 연습하기</h1>
        <p className="text-sm text-muted-foreground">
          내 수업(시연) 녹음을 글로 옮겨 올리면 AI가 평가지에 따라 채점하고 다음에 해 볼 행동을 알려 줘요.
          결과는 나와 그룹 운영진만 볼 수 있어요.
        </p>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">1. 평가지</p>
        <TemplatePicker value={rubricType} onChange={setRubricType} />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">2. 전공·주제 (선택)</p>
        <Input placeholder="예: 기계공학과 / PID 3차시" value={topic} onChange={(e) => setTopic(e.target.value)} />
      </div>
      <Button className="w-full" disabled={busy} onClick={create}>
        {busy ? "만드는 중..." : "만들고 전사문 올리기"}
      </Button>
    </main>
  );
}
