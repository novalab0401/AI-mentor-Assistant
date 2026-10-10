"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import BackLink from "@/components/back-link";
import { supabase } from "@/lib/supabase";

type G = {
  id: string; name: string; created_at: string; owner_name: string | null; owner_email: string | null;
  member_count: number; team_count: number; session_count: number; evaluation_count: number;
  deletion_requested_at: string | null; deletion_reason: string | null;
};
type U = {
  id: string; email: string; display_name: string; is_platform_admin: boolean;
  email_confirmed: boolean; owned_groups: number; group_count: number; created_at: string;
};

// Nova Lab 관리자 화면: 전체 그룹 현황·삭제 요청·그룹장 변경, 가입자 관리
export default function AdminPage() {
  const [groups, setGroups] = useState<G[] | null>(null);
  const [users, setUsers] = useState<U[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"groups" | "users">("groups");
  const [q, setQ] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [ownerEdit, setOwnerEdit] = useState<{ id: string; email: string } | null>(null);
  const [nameEdit, setNameEdit] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    supabase.rpc("admin_list_groups").then(({ data, error }) => {
      if (error) setError(error.message);
      setGroups((data as G[]) ?? []);
    });
    supabase.rpc("admin_list_users").then(({ data }) => setUsers((data as U[]) ?? []));
  }, [reloadKey]);

  async function run(action: PromiseLike<{ error: { message: string } | null }>, after?: () => void) {
    setBusy(true);
    const { error } = await action;
    setBusy(false);
    if (error) return alert(error.message);
    after?.();
    setReloadKey((k) => k + 1);
  }

  if (error) return <main className="p-4">{error}</main>;

  const total = (k: "member_count" | "session_count" | "evaluation_count") =>
    (groups ?? []).reduce((a, g) => a + Number(g[k]), 0);
  const requests = (groups ?? []).filter((g) => g.deletion_requested_at);
  const shownUsers = (users ?? []).filter(
    (u) => q.trim() === "" || u.email.includes(q.trim()) || u.display_name.includes(q.trim())
  );

  return (
    <main className="mx-auto max-w-md space-y-4 p-4">
      <BackLink href="/" label="내 그룹" />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Nova Lab 관리자</h1>
        <Link href="/groups/new" className="rounded-md border px-3 py-1.5 text-sm">+ 그룹 만들기</Link>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        {([
          ["그룹", (groups ?? []).length],
          ["멤버", total("member_count")],
          ["수업", total("session_count")],
          ["평가 줄", total("evaluation_count")],
        ] as const).map(([label, n]) => (
          <div key={label} className="rounded-lg border p-2">
            <p className="text-lg font-bold">{n}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {requests.length > 0 && (
        <button onClick={() => setTab("groups")}
          className="w-full rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm">
          그룹 삭제 요청 {requests.length}건이 있어요
        </button>
      )}

      <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm">
        {(["groups", "users"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-md py-1.5 ${tab === t ? "bg-background font-medium shadow-sm" : "text-muted-foreground"}`}>
            {t === "groups" ? `그룹 ${(groups ?? []).length}` : `가입자 ${(users ?? []).length}`}
          </button>
        ))}
      </div>

      {/* ── 그룹 ── */}
      {tab === "groups" && (
        <section className="space-y-2">
          {groups === null && <p className="text-sm text-muted-foreground">불러오는 중...</p>}
          {groups?.map((g) => (
            <Card key={g.id} className={g.deletion_requested_at ? "border-destructive/60" : ""}>
              <CardHeader>
                <Link href={`/groups/${g.id}`} className="hover:underline">
                  <CardTitle>{g.name}</CardTitle>
                </Link>
                <CardDescription>
                  그룹장 {g.owner_name ?? "-"}{g.owner_email && ` (${g.owner_email})`}
                </CardDescription>
                <CardDescription>
                  멤버 {g.member_count} · 팀 {g.team_count} · 수업 {g.session_count} · 평가 줄 {g.evaluation_count}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {g.deletion_requested_at && (
                  <div className="space-y-2 rounded-md bg-destructive/10 p-2">
                    <p>
                      <b>삭제 요청</b> · {g.deletion_requested_at.slice(0, 10)}
                      {g.deletion_reason && ` · "${g.deletion_reason}"`}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button size="sm" variant="outline" disabled={busy}
                        onClick={() => run(supabase.rpc("cancel_group_deletion", { p_group: g.id }))}>
                        거절 (요청 취소)
                      </Button>
                      <Button size="sm" variant="destructive" disabled={busy}
                        onClick={() =>
                          confirm(`"${g.name}" 그룹을 완전히 삭제할까요? 모든 팀·수업·평가가 지워지고 되돌릴 수 없어요.`) &&
                          run(supabase.from("groups").delete().eq("id", g.id))
                        }>
                        승인 (삭제)
                      </Button>
                    </div>
                  </div>
                )}

                {ownerEdit?.id === g.id ? (
                  <div className="flex gap-2">
                    <Input type="email" placeholder="새 그룹장 이메일" value={ownerEdit.email}
                      onChange={(e) => setOwnerEdit({ ...ownerEdit, email: e.target.value })} />
                    <Button size="sm" disabled={busy || ownerEdit.email.trim() === ""}
                      onClick={() =>
                        run(supabase.rpc("admin_set_owner", { p_group: g.id, p_owner_email: ownerEdit.email }),
                          () => setOwnerEdit(null))
                      }>
                      변경
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setOwnerEdit(null)}>취소</Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setOwnerEdit({ id: g.id, email: "" })}>
                    그룹장 변경
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
          <p className="text-xs text-muted-foreground">
            수업·평가 수에는 운영진이 목록에서 삭제한 기록도 포함돼요. 기록은 DB에 보관돼요.
          </p>
        </section>
      )}

      {/* ── 가입자 ── */}
      {tab === "users" && (
        <section className="space-y-2">
          <Input placeholder="이름 또는 이메일로 검색" value={q} onChange={(e) => setQ(e.target.value)} />
          {shownUsers.map((u) => (
            <Card key={u.id}>
              <CardHeader>
                {nameEdit?.id === u.id ? (
                  <div className="flex gap-2">
                    <Input value={nameEdit.name} onChange={(e) => setNameEdit({ ...nameEdit, name: e.target.value })} />
                    <Button size="sm" disabled={busy || nameEdit.name.trim() === ""}
                      onClick={() =>
                        run(supabase.rpc("admin_rename_user", { p_user: u.id, p_name: nameEdit.name }),
                          () => setNameEdit(null))
                      }>
                      저장
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setNameEdit(null)}>취소</Button>
                  </div>
                ) : (
                  <CardTitle>
                    {u.display_name}
                    {u.is_platform_admin && <span className="text-xs font-normal text-primary"> Nova Lab</span>}
                  </CardTitle>
                )}
                <CardDescription>
                  {u.email} · {u.email_confirmed ? "인증 완료" : "⚠ 이메일 미인증"}
                </CardDescription>
                <CardDescription>
                  그룹 {u.group_count}개 소속{u.owned_groups > 0 && ` · 그룹장 ${u.owned_groups}개`}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setNameEdit({ id: u.id, name: u.display_name })}>
                  이름 수정
                </Button>
                {!u.is_platform_admin && (
                  <Button size="sm" variant="destructive" disabled={busy}
                    onClick={() =>
                      confirm(`${u.display_name} (${u.email}) 계정을 삭제할까요? 로그인할 수 없게 되고, 그룹·팀 소속도 사라져요. 이 사람이 남긴 평가 기록은 남아요.`) &&
                      run(supabase.rpc("admin_delete_user", { p_user: u.id }))
                    }>
                    계정 삭제
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </main>
  );
}
