"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import BackLink from "@/components/back-link";
import { supabase } from "@/lib/supabase";

type U = {
  id: string; email: string; display_name: string; is_platform_admin: boolean;
  group_quota: number; groups_created: number; created_at: string;
};

// Nova Lab 관리자 화면: 구독한 단체 담당자에게 "그룹 만들기" 권한(개수)을 줘요
export default function AdminPage() {
  const [users, setUsers] = useState<U[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    supabase.rpc("admin_list_users").then(({ data, error }) => {
      if (error) setError(error.message);
      setUsers((data as U[]) ?? []);
    });
  }, [reloadKey]);

  async function setQuota(u: U, quota: number) {
    setBusy(u.id);
    const { error } = await supabase.rpc("admin_set_quota", { p_user: u.id, p_quota: quota });
    setBusy(null);
    if (error) return alert("변경 실패: " + error.message);
    setReloadKey((k) => k + 1);
  }

  if (error) return <main className="p-4">{error}</main>;

  const shown = (users ?? []).filter(
    (u) => q.trim() === "" || u.email.includes(q.trim()) || u.display_name.includes(q.trim())
  );

  return (
    <main className="mx-auto max-w-md space-y-4 p-4">
      <BackLink href="/" label="내 그룹" />
      <div>
        <h1 className="text-xl font-bold">Nova Lab 관리자</h1>
        <p className="text-sm text-muted-foreground">
          서비스를 구독한 단체의 담당자에게 그룹을 몇 개 만들 수 있는지 정해 줘요. 0이면 만들 수 없어요.
        </p>
      </div>
      <Input placeholder="이름 또는 이메일로 검색" value={q} onChange={(e) => setQ(e.target.value)} />

      {users === null && <p className="text-sm text-muted-foreground">불러오는 중...</p>}

      {shown.map((u) => (
        <Card key={u.id}>
          <CardHeader>
            <CardTitle>
              {u.display_name}
              {u.is_platform_admin && <span className="text-xs font-normal"> · Nova Lab 관리자</span>}
            </CardTitle>
            <CardDescription>{u.email}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-2 text-sm">
            <span>
              그룹 {u.groups_created}개 만듦 /{" "}
              {u.is_platform_admin ? "제한 없음" : `최대 ${u.group_quota}개`}
            </span>
            {!u.is_platform_admin && (
              <span className="flex items-center gap-1">
                <Button size="sm" variant="outline" disabled={busy === u.id || u.group_quota === 0}
                  onClick={() => setQuota(u, u.group_quota - 1)}>−</Button>
                <span className="w-6 text-center font-semibold">{u.group_quota}</span>
                <Button size="sm" variant="outline" disabled={busy === u.id}
                  onClick={() => setQuota(u, u.group_quota + 1)}>+</Button>
              </span>
            )}
          </CardContent>
        </Card>
      ))}
    </main>
  );
}
