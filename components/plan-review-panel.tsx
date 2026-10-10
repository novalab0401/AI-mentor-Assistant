"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import type { PlanReview } from "@/lib/plan-review";

type Row = { id: number; plan: string; result: PlanReview; created_at: string };

const badge: Record<string, string> = {
  "좋음": "bg-primary/10 text-primary",
  "보완": "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "빠짐": "bg-destructive/10 text-destructive",
};

// 수업 계획 AI 사전 검토 (수업 전에 계획 자체가 적절한지)
export default function PlanReviewPanel({ sessionId, plan, reloadKey }: { sessionId: string; plan: string | null; reloadKey: number }) {
  const [latest, setLatest] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [mine, setMine] = useState(0);

  useEffect(() => {
    supabase
      .from("plan_reviews").select("id, plan, result, created_at")
      .eq("session_id", sessionId).order("created_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => setLatest((data as Row | null) ?? null));
  }, [sessionId, reloadKey, mine]);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);

  async function run() {
    setBusy(true);
    setElapsed(0);
    const { data } = await supabase.auth.getSession();
    const res = await fetch("/api/plan-review", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${data.session?.access_token ?? ""}` },
      body: JSON.stringify({ sessionId }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return alert(body.error ?? "계획 검토 실패");
    setMine((k) => k + 1);
  }

  if (!plan) return null;
  const outdated = latest && latest.plan.trim() !== plan.trim();

  return (
    <div className="space-y-2 text-sm">
      <Button size="sm" variant={latest && !outdated ? "outline" : "default"} className="w-full" disabled={busy} onClick={run}>
        {busy ? `계획 검토 중... ${elapsed}초` : latest ? "계획 다시 검토받기" : "AI에게 계획 검토받기"}
      </Button>
      {latest && (
        <div className="space-y-2 rounded-md border p-3">
          <p className="font-medium">계획 검토 · {latest.created_at.slice(0, 16).replace("T", " ")}</p>
          {outdated && <p className="text-xs text-amber-700 dark:text-amber-400">계획을 고친 뒤라 이 검토는 이전 계획 기준이에요.</p>}
          <p>{latest.result.verdict}</p>
          <ul className="space-y-1.5">
            {latest.result.checks.map((c, i) => (
              <li key={i}>
                <span className={`mr-1.5 rounded px-1.5 py-0.5 text-xs ${badge[c.status] ?? ""}`}>{c.aspect} · {c.status}</span>
                {c.comment}
              </li>
            ))}
          </ul>
          {latest.result.tips.length > 0 && (
            <ul className="ml-4 list-disc text-muted-foreground">{latest.result.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
          )}
          <details>
            <summary className="cursor-pointer text-xs text-muted-foreground">AI가 다듬은 계획 보기</summary>
            <p className="mt-1 whitespace-pre-wrap rounded-md bg-muted p-2 text-xs">{latest.result.suggested_plan}</p>
          </details>
        </div>
      )}
    </div>
  );
}
