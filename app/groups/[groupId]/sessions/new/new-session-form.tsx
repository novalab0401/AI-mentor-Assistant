"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BackLink from "@/components/back-link";
import TemplatePicker from "@/components/template-picker";
import AudienceFields from "@/components/audience-fields";
import ScenePicker from "@/components/scene-picker";
import PlanField from "@/components/plan-field";
import { audienceToRow, emptyAudience } from "@/lib/audience";
import { supabase } from "@/lib/supabase";
import { defaultTemplateId, type Scene } from "@/lib/rubric";

export default function NewSessionForm() {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();
  const [rubricType, setRubricType] = useState(defaultTemplateId);
  const [mentorName, setMentorName] = useState("");
  const [major, setMajor] = useState("");
  const [audience, setAudience] = useState(emptyAudience);
  const [scene, setScene] = useState<Scene>("mock");
  const [plan, setPlan] = useState("");
  const [saving, setSaving] = useState(false);
  // 팀: 운영진은 아무 팀이나(또는 팀 없이), 팀장은 자기 팀만 고를 수 있어요
  const [teamOptions, setTeamOptions] = useState<{ id: string; name: string }[] | null>(null);
  const [teamId, setTeamId] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  // 발표자: 그룹 멤버 중에서 고르면 그 사람이 로그인해서 바로 결과를 볼 수 있어요
  const [people, setPeople] = useState<{ id: string; name: string; university: string | null; department: string | null }[]>([]);
  const [otherUni, setOtherUni] = useState("");
  const [otherDept, setOtherDept] = useState("");
  const [presenterId, setPresenterId] = useState(""); // "" = 아직 안 고름, "other" = 멤버 아님

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user!.id;
      // 그룹 운영진 또는 Nova Lab 관리자
      const { data: adminCheck } = await supabase.rpc("is_group_admin", { gid: groupId });
      const admin = adminCheck === true;
      setIsAdmin(admin);
      const { data: teams } = await supabase
        .from("teams").select("id, name, team_members(user_id, is_leader, status)")
        .eq("group_id", groupId).order("created_at");
      const list = (teams ?? []).filter(
        (t) => admin || t.team_members.some((m) => m.user_id === uid && m.is_leader && m.status === "active")
      );
      setTeamOptions(list.map((t) => ({ id: t.id, name: t.name })));
      if (!admin && list.length > 0) setTeamId(list[0].id);

      const { data: members } = await supabase
        .from("group_members").select("user_id, profiles(display_name, university, department)")
        .eq("group_id", groupId).eq("status", "active");
      setPeople(
        ((members ?? []) as unknown as {
          user_id: string; profiles: { display_name: string; university: string | null; department: string | null } | null;
        }[])
          .map((m) => ({
            id: m.user_id, name: m.profiles?.display_name ?? "(이름 없음)",
            university: m.profiles?.university ?? null, department: m.profiles?.department ?? null,
          }))
          .sort((a, b) => a.name.localeCompare(b.name, "ko"))
      );
    })();
  }, [groupId]);

  const isMentor = rubricType.startsWith("mentor");
  const isOther = presenterId === "other";
  const picked = people.find((p) => p.id === presenterId);
  const presenterName = isOther ? mentorName.trim() : people.find((p) => p.id === presenterId)?.name ?? "";
  const canCreate = presenterName !== "" && !saving && (isAdmin || teamId !== "");

  async function handleCreate() {
    setSaving(true);
    const { data, error } = await supabase
      .from("sessions")
      .insert({
        mentor_name: presenterName,
        presenter_id: isOther ? null : presenterId,
        presenter_university: isOther ? otherUni.trim() || null : picked?.university ?? null,
        presenter_department: isOther ? otherDept.trim() || null : picked?.department ?? null,
        major: major.trim() || null,
        rubric_type: rubricType,
        group_id: groupId,
        team_id: teamId || null,
        ...audienceToRow(audience),
        scene,
        lesson_plan: plan.trim() || null,
      })
      .select("id")
      .single();

    if (error) {
      setSaving(false);
      alert("생성 실패: " + error.message);
      return;
    }
    router.push(`/sessions/${data.id}`);
  }

  return (
    <main className="mx-auto max-w-md space-y-4 p-4">
      <BackLink href={`/groups/${groupId}`} label="그룹" />
      <div>
        <h1 className="text-xl font-bold">평가받을 수업 등록</h1>
        <p className="text-sm text-muted-foreground">
          평가받을 사람을 그룹 멤버 중에서 고르면, 그 사람이 로그인해서 홈 화면의 “내가 받은 평가”에서 바로 결과를 봐요.
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
        <p className="text-sm font-medium">3. 평가받을 사람</p>
        <select className="w-full rounded-md border bg-background px-2 py-2 text-sm"
          value={presenterId} onChange={(e) => setPresenterId(e.target.value)}>
          <option value="">{isMentor ? "발표하는 멘토를 고르세요" : "수업하는 강사를 고르세요"}</option>
          {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          <option value="other">그룹 멤버가 아닌 사람 (이름 직접 입력)</option>
        </select>
        {picked && (
          <p className="text-xs text-muted-foreground">
            소속: {[picked.university, picked.department].filter(Boolean).join(" · ") || "아직 안 적었어요 (본인이 '내 정보'에서 적을 수 있어요)"}
          </p>
        )}
        {isOther && (
          <>
            <Input placeholder="이름" value={mentorName} onChange={(e) => setMentorName(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="대학교 (예: UNIST)" value={otherUni} onChange={(e) => setOtherUni(e.target.value)} />
              <Input placeholder="학과 (예: 기계공학과)" value={otherDept} onChange={(e) => setOtherDept(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">
              멤버가 아니면 사이트에서 직접 볼 수 없어요. 결과 화면의 “피드백 링크”를 보내 주세요.
            </p>
          </>
        )}

        <p className="pt-2 text-sm font-medium">4. 수업 정보</p>
        <Input
          placeholder={isMentor ? "소개할 전공 (선택, 예: 기계공학과)" : "수업 주제 (선택, 예: PID 3차시 P 제어)"}
          value={major}
          onChange={(e) => setMajor(e.target.value)}
        />

        <p className="pt-2 text-sm font-medium">5. 수업 대상</p>
        <AudienceFields value={audience} onChange={setAudience} />

        <p className="pt-2 text-sm font-medium">6. 평가 장면</p>
        <ScenePicker value={scene} onChange={setScene} />

        <p className="pt-2 text-sm font-medium">7. 수업 계획 (선택)</p>
        <PlanField value={plan} onChange={setPlan} />
      </div>

      <Button className="w-full" disabled={!canCreate} onClick={handleCreate}>
        {saving ? "만드는 중..." : "수업 등록"}
      </Button>
    </main>
  );
}
