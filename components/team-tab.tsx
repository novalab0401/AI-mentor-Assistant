"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";

export type TeamMember = {
  user_id: string;
  is_leader: boolean;
  status: "pending" | "active";
  profiles: { display_name: string } | null;
};
export type Team = {
  id: string;
  name: string;
  description: string | null;
  team_members: TeamMember[];
};
type GroupPerson = { user_id: string; name: string };

// 그룹 안의 팀 목록과 관리
// - 운영진: 팀 만들기·삭제, 모든 팀 관리
// - 팀장: 자기 팀의 신청 승인, 팀원 추가·내보내기, 팀장 지정
// - 멤버: 팀 가입 신청, 팀 나가기
export default function TeamTab({
  groupId, teams, people, userId, isAdmin, isGroupMember, onChange, onOpenSessions,
}: {
  groupId: string;
  teams: Team[];
  people: GroupPerson[]; // 그룹에서 활동 중인 사람 (팀원 추가 후보)
  userId: string;
  isAdmin: boolean;
  isGroupMember: boolean; // 그룹 멤버만 팀에 신청할 수 있어요 (Nova Lab 관리자는 관리만)
  onChange: () => void;
  onOpenSessions: (teamId: string) => void; // 수업 탭으로 이동해 이 팀 수업만 보기
}) {
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState<{ name: string; description: string } | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  async function run(action: PromiseLike<{ error: { message: string } | null }>) {
    setBusy(true);
    const { error } = await action;
    setBusy(false);
    if (error) {
      alert(error.message);
      return false;
    }
    onChange();
    return true;
  }

  async function createTeam() {
    if (!creating) return;
    const ok = await run(
      supabase.from("teams").insert({
        group_id: groupId,
        name: creating.name.trim(),
        description: creating.description.trim() || null,
      })
    );
    if (ok) setCreating(null);
  }

  const tm = () => supabase.from("team_members");

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">팀 {teams.length}</h2>
        {isAdmin && !creating && (
          <Button size="sm" variant="outline" onClick={() => setCreating({ name: "", description: "" })}>
            + 팀 만들기
          </Button>
        )}
      </div>

      {creating && (
        <Card>
          <CardContent className="space-y-2 pt-6">
            <Input placeholder="팀 이름 (예: 2027 1기, 기계공학 소개팀)" value={creating.name}
              onChange={(e) => setCreating({ ...creating, name: e.target.value })} />
            <Textarea placeholder="소개 (선택)" value={creating.description}
              onChange={(e) => setCreating({ ...creating, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setCreating(null)}>취소</Button>
              <Button disabled={busy || creating.name.trim() === ""} onClick={createTeam}>만들기</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {teams.length === 0 && !creating && (
        <p className="text-sm text-muted-foreground">
          아직 팀이 없어요. {isAdmin ? "기수나 멘토링 팀을 만들어 보세요." : "운영진이 팀을 만들면 여기에 보여요."}
        </p>
      )}

      {teams.map((t) => {
        const active = t.team_members.filter((m) => m.status === "active");
        const pending = t.team_members.filter((m) => m.status === "pending");
        const mine = t.team_members.find((m) => m.user_id === userId);
        const canManage = isAdmin || (mine?.status === "active" && mine.is_leader);
        const leaders = active.filter((m) => m.is_leader).map((m) => m.profiles?.display_name).join(", ");
        const addable = people.filter((p) => !t.team_members.some((m) => m.user_id === p.user_id));
        const expanded = open === t.id;

        return (
          <Card key={t.id}>
            <CardHeader>
              <button className="text-left" onClick={() => setOpen(expanded ? null : t.id)}>
                <CardTitle>
                  {t.name} <span className="text-xs font-normal text-muted-foreground">{expanded ? "▲" : "▼"}</span>
                </CardTitle>
                <CardDescription>
                  팀원 {active.length}명{leaders && ` · 팀장 ${leaders}`}
                  {mine?.status === "active" && " · 내 팀"}
                  {mine?.status === "pending" && " · 신청 대기 중"}
                  {canManage && pending.length > 0 && ` · 신청 ${pending.length}건`}
                </CardDescription>
              </button>
            </CardHeader>

            {expanded && (
              <CardContent className="space-y-4 text-sm">
                {t.description && <p className="text-muted-foreground">{t.description}</p>}

                <Button variant="outline" className="w-full" onClick={() => onOpenSessions(t.id)}>
                  이 팀의 수업(시연) 보기 →
                </Button>

                {/* 팀 신청 승인 */}
                {canManage && pending.length > 0 && (
                  <div className="space-y-2 rounded-md border border-primary/40 p-2">
                    <p className="font-medium">가입 신청</p>
                    {pending.map((m) => (
                      <div key={m.user_id} className="flex items-center justify-between gap-2">
                        <span>{m.profiles?.display_name}</span>
                        <span className="flex gap-1">
                          <Button size="sm" disabled={busy}
                            onClick={() => run(tm().update({ status: "active" }).eq("team_id", t.id).eq("user_id", m.user_id))}>
                            승인
                          </Button>
                          <Button size="sm" variant="ghost" disabled={busy}
                            onClick={() => run(tm().delete().eq("team_id", t.id).eq("user_id", m.user_id))}>
                            거절
                          </Button>
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 팀원 */}
                <div className="space-y-1.5">
                  <p className="font-medium">팀원</p>
                  {active.length === 0 && <p className="text-muted-foreground">아직 팀원이 없어요.</p>}
                  {active.map((m) => (
                    <div key={m.user_id} className="flex items-center justify-between gap-2">
                      <span>
                        {m.profiles?.display_name}
                        {m.is_leader && <span className="text-xs text-primary"> 팀장</span>}
                        {m.user_id === userId && <span className="text-muted-foreground"> (나)</span>}
                      </span>
                      {canManage && (
                        <span className="flex gap-1">
                          <Button size="sm" variant="outline" disabled={busy}
                            onClick={() => run(tm().update({ is_leader: !m.is_leader }).eq("team_id", t.id).eq("user_id", m.user_id))}>
                            {m.is_leader ? "팀장 해제" : "팀장 지정"}
                          </Button>
                          {m.user_id !== userId && (
                            <Button size="sm" variant="ghost" disabled={busy}
                              onClick={() =>
                                confirm(`${m.profiles?.display_name} 님을 팀에서 내보낼까요?`) &&
                                run(tm().delete().eq("team_id", t.id).eq("user_id", m.user_id))
                              }>
                              내보내기
                            </Button>
                          )}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* 팀원 바로 추가 */}
                {canManage && addable.length > 0 && (
                  <AddMember
                    people={addable}
                    busy={busy}
                    onAdd={(uid) => run(tm().insert({ team_id: t.id, user_id: uid, status: "active" }))}
                  />
                )}

                {/* 내 신청·나가기 */}
                {!mine && isGroupMember && (
                  <Button className="w-full" disabled={busy}
                    onClick={() => run(tm().insert({ team_id: t.id, user_id: userId }))}>
                    이 팀에 가입 신청
                  </Button>
                )}
                {mine && (
                  <Button variant="outline" className="w-full" disabled={busy}
                    onClick={() =>
                      (mine.status === "pending" || confirm(`"${t.name}" 팀에서 나갈까요?`)) &&
                      run(tm().delete().eq("team_id", t.id).eq("user_id", userId))
                    }>
                    {mine.status === "pending" ? "신청 취소" : "팀 나가기"}
                  </Button>
                )}

                {isAdmin && (
                  <Button variant="destructive" className="w-full" disabled={busy}
                    onClick={() =>
                      confirm(`"${t.name}" 팀을 삭제할까요? 팀의 수업 기록은 남고, 팀 연결만 풀려요.`) &&
                      run(supabase.from("teams").delete().eq("id", t.id))
                    }>
                    팀 삭제
                  </Button>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </section>
  );
}

function AddMember({
  people, busy, onAdd,
}: {
  people: GroupPerson[]; busy: boolean; onAdd: (uid: string) => void;
}) {
  const [uid, setUid] = useState("");
  return (
    <div className="flex items-center gap-2">
      <select className="flex-1 rounded-md border bg-background px-2 py-1.5 text-sm"
        value={uid} onChange={(e) => setUid(e.target.value)}>
        <option value="">그룹 멤버 중에서 팀원 추가...</option>
        {people.map((p) => <option key={p.user_id} value={p.user_id}>{p.name}</option>)}
      </select>
      <Button size="sm" disabled={busy || uid === ""} onClick={() => { onAdd(uid); setUid(""); }}>
        추가
      </Button>
    </div>
  );
}
