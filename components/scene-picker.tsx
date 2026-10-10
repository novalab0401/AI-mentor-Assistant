"use client";

import { scenes, type Scene } from "@/lib/rubric";

// 평가 장면 고르기: 학생이 있었는지에 따라 평가 항목이 달라져요
export default function ScenePicker({ value, onChange }: { value: Scene; onChange: (s: Scene) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-3 gap-1.5">
        {scenes.map((s) => (
          <button key={s.id} type="button" onClick={() => onChange(s.id)}
            className={`rounded-md border px-2 py-2 text-sm ${value === s.id ? "border-primary bg-primary/10 font-medium" : ""}`}>
            {s.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{scenes.find((s) => s.id === value)?.help}</p>
    </div>
  );
}
