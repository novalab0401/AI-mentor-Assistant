"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useOperator } from "@/lib/use-operator";
import { roleLabels, type Role } from "@/lib/roles";
import { canCreateGroup, usePermissions } from "@/lib/use-permissions";
import { getTemplate } from "@/lib/rubric";

type MyFeedback = {
  session_id: string; session_no: number; session_date: string; mentor_name: string; major: string | null;
  rubric_type: string; group_name: string; team_name: string | null;
  feedback_open: boolean; feedback_token: string | null; evaluator_count: number;
};

type MyGroup = {
  role: Role;
  status: "pending" | "active";
  groups: { id: string; name: string; description: string | null } | null;
};

export default function Home() {
  const user = useOperator();
  const [mine, setMine] = useState<MyGroup[] | null>(null);
  const [name, setName] = useState("");
  const [feedback, setFeedback] = useState<MyFeedback[]>([]);
  const perm = usePermissions(!!user);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("group_members")
      .select("role, status, groups(id, name, description)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setMine((data as unknown as MyGroup[]) ?? []));
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single()
      .then(({ data }) => setName(data?.display_name ?? ""));
    supabase.rpc("my_feedback_list").then(({ data }) => setFeedback((data as MyFeedback[]) ?? []));
  }, [user]);

  async function logout() {
    await supabase.auth.signOut();
    setMine(null);
  }

  if (user === undefined) return <main className="p-4">확인 중...</main>;

  if (user === null) {
    return (
      <main className="mx-auto max-w-md space-y-4 p-4 pt-16">
        <h1 className="text-2xl font-bold">Nova Lab 멘토 평가</h1>
        <p className="text-sm text-muted-foreground">
          멘토단 그룹에서 시연하고, 서로 평가하고, 피드백으로 성장하는 곳이에요.
        </p>
        <Link href="/login"
          className="block rounded-md bg-primary py-3 text-center font-medium text-primary-foreground">
          로그인
        </Link>
        <Link href="/signup" className="block rounded-md border py-3 text-center font-medium">
          회원가입
        </Link>
        <p className="text-xs text-muted-foreground">
          평가 링크를 받았다면 그 링크로 바로 들어가면 돼요.
        </p>
      </main>
    );
  }

  const active = (mine ?? []).filter((m) => m.status === "active" && m.groups);
  const pending = (mine ?? []).filter((m) => m.status === "pending" && m.groups);

  return (
    <main className="mx-auto max-w-md space-y-5 p-4 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">안녕하세요</p>
          <h1 className="text-xl font-bold">{name || user.email} 님</h1>
        </div>
        <button onClick={logout} className="text-xs text-muted-foreground underline">로그아웃</button>
      </div>

      <div className={`grid gap-2 ${canCreateGroup(perm) ? "grid-cols-2" : "grid-cols-1"}`}>
        <Link href="/groups"
          className="rounded-md bg-primary py-2.5 text-center text-sm font-medium text-primary-foreground">
          그룹 찾기
        </Link>
        {canCreateGroup(perm) && (
          <Link href="/groups/new" className="rounded-md border py-2.5 text-center text-sm font-medium">
            + 새 그룹 만들기
          </Link>
        )}
      </div>

      {perm?.is_platform_admin && (
        <Link href="/admin" className="block rounded-md border border-dashed py-2 text-center text-sm">
          Nova Lab 관리자: 전체 그룹 현황
        </Link>
      )}

      {feedback.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            내가 받은 평가 {feedback.filter((f) => f.feedback_open).length > 0 &&
              <span className="text-primary">· 확인 가능 {feedback.filter((f) => f.feedback_open).length}건</span>}
          </h2>
          {feedback.map((f) => {
            const body = (
              <>
                <CardHeader>
                  <CardDescription>
                    {f.session_date} · {f.group_name}{f.team_name && ` · ${f.team_name}`}
                  </CardDescription>
                  <CardTitle>
                    시연 #{f.session_no}{f.major && <span className="font-normal"> · {f.major}</span>}
                  </CardTitle>
                  <CardDescription>
                    {getTemplate(f.rubric_type).name} · 평가자 {f.evaluator_count}명 ·{" "}
                    {f.feedback_open ? <b className="text-primary">결과 보기 →</b> : "운영진이 공개하면 볼 수 있어요"}
                  </CardDescription>
                </CardHeader>
              </>
            );
            return f.feedback_open && f.feedback_token ? (
              <Link key={f.session_id} href={`/feedback/${f.feedback_token}`} className="block">
                <Card className="border-primary/40 transition-colors hover:bg-muted">{body}</Card>
              </Link>
            ) : (
              <Card key={f.session_id} className="opacity-70">{body}</Card>
            );
          })}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">내 그룹</h2>
        {mine === null && <p className="text-sm text-muted-foreground">불러오는 중...</p>}
        {mine !== null && active.length === 0 && (
          <p className="text-sm text-muted-foreground">
            아직 속한 그룹이 없어요. 그룹을 찾아 가입을 신청하거나 새로 만들어 보세요.
          </p>
        )}
        {active.map((m) => (
          <Link key={m.groups!.id} href={`/groups/${m.groups!.id}`} className="block">
            <Card className="transition-colors hover:bg-muted">
              <CardHeader>
                <CardTitle>{m.groups!.name}</CardTitle>
                <CardDescription>
                  내 역할: {roleLabels[m.role]}
                  {m.groups!.description && ` · ${m.groups!.description}`}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </section>

      {pending.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">승인 대기 중</h2>
          {pending.map((m) => (
            <Link key={m.groups!.id} href={`/groups/${m.groups!.id}`}
              className="block rounded-lg border border-dashed p-3 text-sm">
              {m.groups!.name}
              <span className="text-muted-foreground"> · 운영진 승인을 기다리고 있어요</span>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
