"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

type Row = {
  id: string;
  session_no: number;
  mentor_name: string;
  major: string | null;
  session_date: string;
  evaluations: { evaluator_name: string }[];
};

export default function SessionsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    supabase
      .from("sessions")
      .select("id, session_no, mentor_name, major, session_date, evaluations(evaluator_name)")
      .order("session_no", { ascending: false })
      .then(({ data, error }) => {
        if (error) alert("불러오기 실패: " + error.message);
        setRows(data ?? []);
      });
  }, []);

  if (rows === null) return <main className="p-4">불러오는 중...</main>;

  return (
    <main className="mx-auto max-w-md space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">시연 목록</h1>
        <Link href="/sessions/new" className="rounded-md border px-3 py-1.5 text-sm">
          + 시연 등록
        </Link>
      </div>

      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground">아직 시연이 없어요.</p>
      )}

      {rows.map((s) => {
        const evaluatorCount = new Set(s.evaluations.map((e) => e.evaluator_name)).size;
        return (
          <Link key={s.id} href={`/sessions/${s.id}`} className="block">
            <Card className="transition-colors hover:bg-muted">
              <CardHeader>
                <CardDescription>시연 #{s.session_no} · {s.session_date}</CardDescription>
                <CardTitle>{s.mentor_name}{s.major ? ` · ${s.major}` : ""}</CardTitle>
                <CardDescription>평가자 {evaluatorCount}명</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        );
      })}
    </main>
  );
}