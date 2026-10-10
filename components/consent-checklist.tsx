"use client";

import Link from "next/link";
import type { ConsentChoice } from "@/lib/legal";

function Row({
  checked, onToggle, label, link,
}: {
  checked: boolean;
  onToggle: (v: boolean) => void;
  label: React.ReactNode;
  link?: { href: string; text: string };
}) {
  return (
    <label className="flex items-start gap-2 py-1 text-sm">
      <input type="checkbox" className="mt-1 size-4" checked={checked}
        onChange={(e) => onToggle(e.target.checked)} />
      <span className="flex-1">
        {label}
        {link && (
          <Link href={link.href} target="_blank" className="ml-1 text-xs text-muted-foreground underline">
            {link.text}
          </Link>
        )}
      </span>
    </label>
  );
}

// 회원가입·동의 화면에서 쓰는 동의 체크 목록
export default function ConsentChecklist({
  value,
  onChange,
}: {
  value: ConsentChoice;
  onChange: (v: ConsentChoice) => void;
}) {
  const all = value.age && value.terms && value.privacy && value.research;
  const toggle = (k: keyof ConsentChoice) => (v: boolean) => onChange({ ...value, [k]: v });

  return (
    <div className="space-y-1 rounded-lg border p-3">
      <label className="flex items-center gap-2 border-b pb-2 text-sm font-medium">
        <input
          type="checkbox"
          className="size-4"
          checked={all}
          onChange={(e) => {
            const v = e.target.checked;
            onChange({ age: v, terms: v, privacy: v, research: v });
          }}
        />
        전체 동의
      </label>
      <Row checked={value.age} onToggle={toggle("age")} label={<><b>[필수]</b> 만 14세 이상이에요</>} />
      <Row checked={value.terms} onToggle={toggle("terms")} label={<><b>[필수]</b> 이용약관 동의</>}
        link={{ href: "/terms", text: "보기" }} />
      <Row checked={value.privacy} onToggle={toggle("privacy")}
        label={<><b>[필수]</b> 개인정보 수집·이용 동의</>} link={{ href: "/privacy", text: "보기" }} />
      <Row
        checked={value.research}
        onToggle={toggle("research")}
        label={
          <>
            <b>[선택]</b> 이름 등 개인을 알아볼 수 없게 처리한 평가 데이터를 평가 기준 개선과
            AI 채점 연구에 활용하는 데 동의
          </>
        }
        link={{ href: "/privacy#research", text: "자세히" }}
      />
      <p className="pt-1 text-xs text-muted-foreground">
        선택 항목은 동의하지 않아도 서비스를 이용할 수 있어요.
      </p>
    </div>
  );
}
