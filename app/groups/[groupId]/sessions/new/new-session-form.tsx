"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BackLink from "@/components/back-link";
import TemplatePicker from "@/components/template-picker";
import { supabase } from "@/lib/supabase";
import { defaultTemplateId } from "@/lib/rubric";

export default function NewSessionForm() {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();
  const [rubricType, setRubricType] = useState(defaultTemplateId);
  const [mentorName, setMentorName] = useState("");
  const [major, setMajor] = useState("");
  const [saving, setSaving] = useState(false);
  // 팀: 운영진은 아무 팀이나(또는 팀 없이), 팀장은 자기 팀만 고를 수 있어요
  const [teamOptions, setTeamOptions] = useState<{ id: string; name: string }[] | null>(null);
  const [teamId, setTeamId] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user!.id;
      const { data: me } = await supabase
        .from("group_members").select("role, status")
        .eq("group_id", groupId).eq("user_id", uid).maybeSingle();
      const admin = me?.status === "active" && me.role === "admin";
      setIsAdmin(admin);
      const { data: teams } = await supabase
        .from("teams").select("id, name, team_members(user_id, is_leader, status)")
        .eq("group_id", groupId).order("created_at");
      const list = (teams ?? []).filter(
        (t) => admin || t.team_members.some((m) => m.user_id === uid && m.is_leader && m.status === "active")
      );
      setTeamOptions(list.map((t) => ({ id: t.id, name: t.name })));
      if (!admin && list.length > 0) setTeamId(list[0].id);
    })();
  }, [groupId]);

  const isMentor = rubricType.startsWith("mentor");
  const canCreate = mentorName.trim() !== "" && !saving && (isAdmin || teamId !== "");

  async function handleCreate() {
    setSaving(true);
    const { data, error } = await supabase
      .from("sessions")
      .insert({
        mentor_name: mentorName.trim(),
        major: major.trim() || null,
        rubric_type: rubricType,
        group_id: groupId,
        team_id: teamId || null,
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
      <BackLink href={`/groups/${groupId}`} label="그룹" />
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
        <p className="text-sm font-medium">2. 팀</p>
        <select className="w-full rounded-md border bg-background px-2 py-2 text-sm"
          value={teamId} onChange={(e) => setTeamId(e.target.value)}>
          {isAdmin && <option value="">팀 없음 (그룹 전체)</option>}
          {(teamOptions ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <p className="text-xs text-muted-foreground">
          평가 결과는 그룹 운영진과 이 팀의 팀장이 볼 수 있어요.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">3. 수업 정보</p>
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
