"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import BackLink from "@/components/back-link";
import { supabase } from "@/lib/supabase";
import { roleLabels, type Role } from "@/lib/roles";
import { canCreateGroup, usePermissions } from "@/lib/use-permissions";

type G = {
  id: string; name: string; description: string | null;
  member_count: number; my_status: "pending" | "active" | null; my_role: Role | null;
};

export default function GroupsPage() {
  const [groups, setGroups] = useState<G[] | null>(null);
  const [q, setQ] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const perm = usePermissions(true);

  useEffect(() => {
    supabase.rpc("list_groups").then(({ data, error }) => {
      if (error) alert("불러오기 실패: " + error.message);
      setGroups((data as G[]) ?? []);
    });
  }, [reloadKey]);

  async function requestJoin(groupId: string) {
    setBusy(groupId);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("group_members")
      .insert({ group_id: groupId, user_id: auth.user!.id });
    setBusy(null);
    if (error) return alert("신청 실패: " + error.message);
    setReloadKey((k) => k + 1);
  }

  const shown = (groups ?? []).filter(
    (g) => q.trim() === "" || g.name.includes(q.trim()) || (g.description ?? "").includes(q.trim())
  );

  return (
    <main className="mx-auto max-w-md space-y-4 p-4">
      <BackLink href="/" label="내 그룹" />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">그룹 찾기</h1>
        {canCreateGroup(perm) && (
          <Link href="/groups/new" className="rounded-md border px-3 py-1.5 text-sm">+ 새 그룹</Link>
        )}
      </div>
      <Input placeholder="그룹 이름으로 검색" value={q} onChange={(e) => setQ(e.target.value)} />

      {groups === null && <p className="text-sm text-muted-foreground">불러오는 중...</p>}
      {groups !== null && shown.length === 0 && (
        <p className="text-sm text-muted-foreground">찾는 그룹이 없어요.</p>
      )}

      {shown.map((g) => (
        <Card key={g.id}>
          <CardHeader>
            <CardTitle>{g.name}</CardTitle>
            <CardDescription>
              멤버 {g.member_count}명{g.description && ` · ${g.description}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {g.my_status === "active" ? (
              <Link href={`/groups/${g.id}`}
                className="block rounded-lg border py-1.5 text-center text-sm">
                들어가기 ({roleLabels[g.my_role!]})
              </Link>
            ) : g.my_status === "pending" ? (
              <p className="text-center text-sm text-muted-foreground">승인 대기 중이에요</p>
            ) : (
              <Button className="w-full" disabled={busy === g.id} onClick={() => requestJoin(g.id)}>
                {busy === g.id ? "신청 중..." : "가입 신청"}
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </main>
  );
}
