"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BackLink from "@/components/back-link";
import RubricForm from "@/components/rubric-form";
import { supabase } from "@/lib/supabase";
import { getTemplate, isComplete, scoredOf, toRows, type Answers } from "@/lib/rubric";
import { useOperator } from "@/lib/use-operator";

type Session = { session_no: number; mentor_name: string; major: string | null; rubric_type: string };

const empty: Answers = { scores: {}, memos: {} };

export default function EvaluateForm() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const operator = useOperator();

  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [answers, setAnswers] = useState<Answers>(empty);
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

  const template = getTemplate(session?.rubric_type);
  const items = template.items;
  const scoredItems = scoredOf(items);
  const done = scoredItems.filter((i) => i.id in answers.scores).length;
  const canSubmit = name.trim() !== "" && isComplete(items, answers) && !saving;

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleSubmit() {
    setSaving(true);
    const rows = toRows(items, answers).map((r) => ({
      ...r,
      session_id: sessionId,
      evaluator_name: name.trim(),
    }));

    const { error } = await supabase.from("evaluations").insert(rows);
    setSaving(false);

    if (error) {
      alert("저장 실패: " + error.message);
      return;
    }
    setAnswers(empty);
    setSubmitted(true);
    window.scrollTo(0, 0);
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
    <main className="mx-auto max-w-md space-y-4 p-4 pb-24">
      {operator && <BackLink href={`/sessions/${sessionId}`} label="결과 화면" />}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">시연 #{session.session_no}</p>
          <h1 className="text-xl font-bold">
            {session.mentor_name}
            {session.major && <span className="font-normal"> · {session.major}</span>}
          </h1>
          <p className="text-sm text-muted-foreground">평가지: {template.name}</p>
        </div>
        <Button variant="outline" size="sm" onClick={copyLink}>
          {copied ? "복사됨!" : "링크 복사"}
        </Button>
      </div>

      <Input placeholder="내 이름 (평가하는 사람)" value={name}
        onChange={(e) => setName(e.target.value)} />

      <RubricForm items={items} value={answers} onChange={setAnswers} />

      {/* 화면 아래에 붙어 있는 제출 바: 길게 스크롤해도 진행 상황이 보여요 */}
      <div className="fixed inset-x-0 bottom-0 border-t bg-background/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <span className="shrink-0 text-sm text-muted-foreground">
            {done} / {scoredItems.length}
          </span>
          <Button className="w-full" disabled={!canSubmit} onClick={handleSubmit}>
            {saving ? "저장 중..." : name.trim() === "" ? "이름을 입력해 주세요" : "제출"}
          </Button>
        </div>
      </div>
    </main>
  );
}
