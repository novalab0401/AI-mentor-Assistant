"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { items } from "@/lib/rubric";
import { useOperator } from "@/lib/use-operator";

type Session = { session_no: number; mentor_name: string; major: string | null };

export default function EvaluateForm() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const operator = useOperator();

  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [memos, setMemos] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // 선배(로그인 없음)는 시연 표를 직접 못 봐요.
    // 대신 "이 링크의 시연 하나만" 알려 주는 DB 함수를 불러요.
    supabase
      .rpc("get_evaluation_session", { p_id: sessionId })
      .then(({ data }) => setSession((data as Session[] | null)?.[0] ?? null));
  }, [sessionId]);

  const done = Object.keys(scores).length;
  const canSubmit = name.trim() !== "" && done === items.length && !saving;

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleSubmit() {
    setSaving(true);
    const rows = items.map((item) => ({
      session_id: sessionId,
      evaluator_name: name.trim(),
      item_id: item.id,
      score: scores[item.id],
      memo: memos[item.id] || null,
    }));

    const { error } = await supabase.from("evaluations").insert(rows);

    if (error) {
      setSaving(false);
      alert("저장 실패: " + error.message);
      return;
    }
    setSaving(false);
    setScores({});
    setMemos({});
    setSubmitted(true);
  }

  if (session === undefined) return <main className="p-4">불러오는 중...</main>;
  if (session === null)
    return <main className="p-4">존재하지 않는 시연이에요. 링크를 다시 확인해 주세요.</main>;

  if (submitted) {
    return (
      <main className="mx-auto max-w-md space-y-4 p-4 pt-16 text-center">
        <h1 className="text-xl font-bold">제출 완료!</h1>
        <p className="text-sm text-muted-foreground">
          {name.trim()} 님, {session.mentor_name} 멘토 시연 평가에 참여해 주셔서 감사해요.
        </p>
        <Button variant="outline" className="w-full"
          onClick={() => { setName(""); setSubmitted(false); }}>
          다른 평가자로 한 번 더 입력
        </Button>
        {operator && (
          <Link href={`/sessions/${sessionId}`}
            className="block rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground">
            결과 보기 (운영자)
          </Link>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md space-y-4 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">시연 #{session.session_no}</p>
          <h1 className="text-xl font-bold">
            {session.mentor_name}
            {session.major && <span className="font-normal"> · {session.major}</span>}
          </h1>
          <p className="text-sm text-muted-foreground">위 멘토의 시연을 평가해요</p>
          <p className="text-sm text-muted-foreground">
            {done} / {items.length} 항목 완료
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={copyLink}>
          {copied ? "복사됨!" : "링크 복사"}
        </Button>
      </div>

      <Input placeholder="내 이름 (평가하는 사람)" value={name}
        onChange={(e) => setName(e.target.value)} />

      {items.map((item) => (
        <Card key={item.id}>
          <CardHeader>
            <CardTitle>{item.title}</CardTitle>
            <CardDescription>{item.question}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((n) => (
                <Button
                  key={n}
                  variant={scores[item.id] === n ? "default" : "outline"}
                  onClick={() => setScores({ ...scores, [item.id]: n })}
                >
                  {n}점
                </Button>
              ))}
            </div>
            <Textarea
              placeholder="근거가 된 장면이나 발화 (선택)"
              value={memos[item.id] ?? ""}
              onChange={(e) => setMemos({ ...memos, [item.id]: e.target.value })}
            />
          </CardContent>
        </Card>
      ))}

      <Button className="w-full" disabled={!canSubmit} onClick={handleSubmit}>
        {saving ? "저장 중..." : "제출"}
      </Button>
    </main>
  );
}