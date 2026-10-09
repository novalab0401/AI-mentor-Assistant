"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import BackLink from "@/components/back-link";
import { supabase } from "@/lib/supabase";

type G = {
  id: string; name: string; created_at: string; owner_name: string | null; owner_email: string | null;
  member_count: number; team_count: number; session_count: number; evaluation_count: number;
};
type U = { id: string; email: string; display_name: string; is_platform_admin: boolean; created_at: string };

// Nova Lab 관리자 화면: 전체 그룹 현황, 그룹 만들기, 가입자 목록
export default function AdminPage() {
  const [groups, setGroups] = useState<G[] | null>(null);
  const [users, setUsers] = useState<U[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"groups" | "users">("groups");
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase.rpc("admin_list_groups").then(({ data, error }) => {
      if (error) setError(error.message);
      setGroups((data as G[]) ?? []);
    });
    supabase.rpc("admin_list_users").then(({ data }) => setUsers((data as U[]) ?? []));
  }, []);

  if (error) return <main className="p-4">{error}</main>;

  const total = (k: keyof Pick<G, "member_count" | "session_count" | "evaluation_count">) =>
    (groups ?? []).reduce((a, g) => a + Number(g[k]), 0);
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

      {/* 전체 숫자 */}
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          ["그룹", (groups ?? []).length],
          ["멤버", total("member_count")],
          ["수업", total("session_count")],
          ["평가 줄", total("evaluation_count")],
        ].map(([label, n]) => (
          <div key={label} className="rounded-lg border p-2">
            <p className="text-lg font-bold">{n}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm">
        {(["groups", "users"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-md py-1.5 ${tab === t ? "bg-background font-medium shadow-sm" : "text-muted-foreground"}`}>
            {t === "groups" ? "그룹" : `가입자 ${(users ?? []).length}`}
          </button>
        ))}
      </div>

      {tab === "groups" && (
        <section className="space-y-2">
          {groups === null && <p className="text-sm text-muted-foreground">불러오는 중...</p>}
          {groups?.map((g) => (
            <Link key={g.id} href={`/groups/${g.id}`} className="block">
              <Card className="transition-colors hover:bg-muted">
                <CardHeader>
                  <CardTitle>{g.name}</CardTitle>
                  <CardDescription>
                    그룹장 {g.owner_name ?? "-"}{g.owner_email && ` (${g.owner_email})`}
                  </CardDescription>
                  <CardDescription>
                    멤버 {g.member_count} · 팀 {g.team_count} · 수업 {g.session_count} · 평가 줄 {g.evaluation_count}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
          <p className="text-xs text-muted-foreground">
            수업·평가 수에는 운영진이 목록에서 삭제한 기록도 포함돼요. 기록은 DB에 보관돼요.
          </p>
        </section>
      )}

      {tab === "users" && (
        <section className="space-y-2">
          <Input placeholder="이름 또는 이메일로 검색" value={q} onChange={(e) => setQ(e.target.value)} />
          {shownUsers.map((u) => (
            <div key={u.id} className="flex justify-between rounded-lg border p-3 text-sm">
              <span>
                {u.display_name}
                {u.is_platform_admin && <span className="text-xs text-primary"> Nova Lab</span>}
              </span>
              <span className="text-muted-foreground">{u.email}</span>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
