"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import BackLink from "@/components/back-link";
import SessionList from "@/components/session-list";
import { supabase } from "@/lib/supabase";
import { useOperator } from "@/lib/use-operator";
import { roleLabels, roles, type Role } from "@/lib/roles";

type Group = { id: string; name: string; description: string | null };
type Member = {
  user_id: string;
  role: Role;
  status: "pending" | "active";
  created_at: string;
  profiles: { display_name: string } | null;
};

export default function GroupHome() {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();
  const user = useOperator();

  const [group, setGroup] = useState<Group | null | undefined>(undefined);
  const [members, setMembers] = useState<Member[]>([]);
  const [me, setMe] = useState<Member | null | undefined>(undefined);
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"sessions" | "members">("sessions");
  const [editing, setEditing] = useState<{ name: string; description: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("groups")
      .select("id, name, description")
      .eq("id", groupId)
      .maybeSingle()
      .then(({ data }) => setGroup(data ?? null));

    // 활동 중인 멤버는 그룹 멤버 전체를, 아니면 내 줄만 볼 수 있어요 (보안 규칙)
    supabase
      .from("group_members")
      .select("user_id, role, status, created_at, profiles(display_name)")
      .eq("group_id", groupId)
      .order("created_at")
      .then(({ data }) => {
        const list = (data as unknown as Member[]) ?? [];
        setMembers(list);
        setMe(list.find((m) => m.user_id === user.id) ?? null);
      });
  }, [groupId, user, reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  async function run(action: PromiseLike<{ error: { message: string } | null }>, after?: () => void) {
    setBusy(true);
    const { error } = await action;
    setBusy(false);
    if (error) {
      alert(error.message);
      return false;
    }
    after?.();
    reload();
    return true;
  }

  const joinRequest = () =>
    run(supabase.from("group_members").insert({ group_id: groupId, user_id: user!.id }));

  const cancelOrLeave = (leaving: boolean) => {
    if (leaving && !confirm(`"${group?.name}" 그룹에서 나갈까요?`)) return;
    run(
      supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", user!.id),
      leaving ? () => router.push("/") : undefined
    );
  };

  const approve = (m: Member, role: Role) =>
    run(supabase.from("group_members").update({ status: "active", role })
      .eq("group_id", groupId).eq("user_id", m.user_id));

  const changeRole = (m: Member, role: Role) => {
    if (m.user_id === user!.id && role !== "admin" &&
        !confirm("내 운영진 권한을 내려놓을까요? 다시 받으려면 다른 운영진이 지정해야 해요.")) return;
    run(supabase.from("group_members").update({ role })
      .eq("group_id", groupId).eq("user_id", m.user_id));
  };

  const removeMember = (m: Member, isPending: boolean) => {
    const who = m.profiles?.display_name ?? "이 사람";
    if (!confirm(isPending ? `${who} 님의 가입 신청을 거절할까요?` : `${who} 님을 그룹에서 내보낼까요?`)) return;
    run(supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", m.user_id));
  };

  const saveGroup = () =>
    editing &&
    run(
      supabase.from("groups")
        .update({ name: editing.name.trim(), description: editing.description.trim() || null })
        .eq("id", groupId),
      () => setEditing(null)
    );

  const deleteGroup = () => {
    if (!confirm(`"${group?.name}" 그룹을 삭제할까요? 모든 수업 기록과 평가가 함께 지워지고 되돌릴 수 없어요.`)) return;
    run(supabase.from("groups").delete().eq("id", groupId), () => router.push("/"));
  };

  if (group === undefined || me === undefined) return <main className="p-4">불러오는 중...</main>;
  if (group === null) return <main className="p-4">존재하지 않는 그룹이에요.</main>;

  const isActive = me?.status === "active";
  const isAdmin = isActive && me?.role === "admin";
  const active = members.filter((m) => m.status === "active");
  const pending = members.filter((m) => m.status === "pending");

  return (
    <main className="mx-auto max-w-md space-y-4 p-4">
      <BackLink href="/" label="내 그룹" />

      {/* ── 그룹 정보 ── */}
      {editing ? (
        <div className="space-y-2">
          <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          <Textarea placeholder="소개 (선택)" value={editing.description}
            onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>취소</Button>
            <Button disabled={busy || editing.name.trim() === ""} onClick={saveGroup}>저장</Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold">{group.name}</h1>
            {group.description && <p className="text-sm text-muted-foreground">{group.description}</p>}
            {isActive && (
              <p className="text-sm text-muted-foreground">
                내 역할: {roleLabels[me!.role]} · 멤버 {active.length}명
              </p>
            )}
          </div>
          {isAdmin && (
            <Button size="sm" variant="outline"
              onClick={() => setEditing({ name: group.name, description: group.description ?? "" })}>
              그룹 수정
            </Button>
          )}
        </div>
      )}

      {/* ── 아직 멤버가 아닐 때 ── */}
      {!me && (
        <Card>
          <CardContent className="space-y-3 pt-6 text-sm">
            <p>이 그룹의 멤버가 아니에요. 가입을 신청하면 운영진이 승인한 뒤 들어올 수 있어요.</p>
            <Button className="w-full" disabled={busy} onClick={joinRequest}>가입 신청</Button>
          </CardContent>
        </Card>
      )}
      {me?.status === "pending" && (
        <Card>
          <CardContent className="space-y-3 pt-6 text-sm">
            <p>가입 신청을 보냈어요. 운영진이 승인하면 활동할 수 있어요.</p>
            <Button variant="outline" className="w-full" disabled={busy}
              onClick={() => cancelOrLeave(false)}>신청 취소</Button>
          </CardContent>
        </Card>
      )}

      {/* ── 멤버일 때 ── */}
      {isActive && (
        <>
          {isAdmin && pending.length > 0 && (
            <button onClick={() => setTab("members")}
              className="w-full rounded-md border border-primary/50 bg-primary/10 p-2 text-sm">
              가입 신청 {pending.length}건이 승인을 기다리고 있어요 →
            </button>
          )}

          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm">
            {(["sessions", "members"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`rounded-md py-1.5 ${tab === t ? "bg-background font-medium shadow-sm" : "text-muted-foreground"}`}>
                {t === "sessions" ? "수업(시연)" : `멤버 ${active.length}`}
              </button>
            ))}
          </div>

          {tab === "sessions" && <SessionList groupId={groupId} isAdmin={isAdmin} />}

          {tab === "members" && (
            <section className="space-y-3">
              {isAdmin && pending.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>가입 신청</CardTitle>
                    <CardDescription>역할을 골라 승인하세요. 나중에 바꿀 수 있어요.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {pending.map((m) => (
                      <PendingRow key={m.user_id} m={m} busy={busy}
                        onApprove={(role) => approve(m, role)}
                        onReject={() => removeMember(m, true)} />
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>멤버</CardTitle>
                  {isAdmin && (
                    <CardDescription>
                      역할을 바꾸거나 다른 사람을 운영진으로 지정(위임)할 수 있어요.
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  {active.map((m) => (
                    <div key={m.user_id} className="flex items-center justify-between gap-2 text-sm">
                      <span>
                        {m.profiles?.display_name ?? "(이름 없음)"}
                        {m.user_id === user!.id && <span className="text-muted-foreground"> (나)</span>}
                      </span>
                      {isAdmin ? (
                        <span className="flex items-center gap-1">
                          <select
                            className="rounded-md border bg-background px-2 py-1 text-sm"
                            value={m.role}
                            disabled={busy}
                            onChange={(e) => changeRole(m, e.target.value as Role)}
                          >
                            {roles.map((r) => <option key={r} value={r}>{roleLabels[r]}</option>)}
                          </select>
                          {m.user_id !== user!.id && (
                            <Button size="sm" variant="ghost" disabled={busy}
                              onClick={() => removeMember(m, false)}>내보내기</Button>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{roleLabels[m.role]}</span>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Button variant="outline" className="w-full" disabled={busy} onClick={() => cancelOrLeave(true)}>
                그룹 나가기
              </Button>
              {isAdmin && (
                <Button variant="destructive" className="w-full" disabled={busy} onClick={deleteGroup}>
                  그룹 삭제
                </Button>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}

function PendingRow({
  m, busy, onApprove, onReject,
}: {
  m: Member; busy: boolean; onApprove: (role: Role) => void; onReject: () => void;
}) {
  const [role, setRole] = useState<Role>("trainee");
  return (
    <div className="space-y-2 border-b pb-3 text-sm last:border-0 last:pb-0">
      <p className="font-medium">{m.profiles?.display_name ?? "(이름 없음)"}</p>
      <div className="flex items-center gap-2">
        <select className="flex-1 rounded-md border bg-background px-2 py-1.5 text-sm"
          value={role} onChange={(e) => setRole(e.target.value as Role)}>
          {roles.map((r) => <option key={r} value={r}>{roleLabels[r]}</option>)}
        </select>
        <Button size="sm" disabled={busy} onClick={() => onApprove(role)}>승인</Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={onReject}>거절</Button>
      </div>
    </div>
  );
}
