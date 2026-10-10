"use client";

import { templates } from "@/lib/rubric";

// 평가지(수업 종류 × 평가 장면) 고르기
export default function TemplatePicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      {templates.map((t) => {
        const selected = t.id === value;
        const count = t.items.filter((i) => i.kind === "score").length;
        return (
          <button
            key={t.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(t.id)}
            className={`w-full rounded-lg border p-3 text-left transition-colors disabled:opacity-50 ${
              selected ? "border-primary bg-primary/10" : "hover:bg-muted"
            }`}
          >
            <p className="text-sm font-medium">
              {selected ? "● " : "○ "}
              {t.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {t.description} · 점수 항목 {count}개
            </p>
          </button>
        );
      })}
    </div>
  );
}
