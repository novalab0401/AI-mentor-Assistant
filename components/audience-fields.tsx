"use client";

import { Input } from "@/components/ui/input";
import { audienceLevels, type Audience } from "@/lib/audience";

// 수업 대상 입력 칸 (학년, 인원, 계열·사전지식)
export default function AudienceFields({
  value, onChange,
}: {
  value: Audience;
  onChange: (v: Audience) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_6rem] gap-2">
        <select className="w-full rounded-md border bg-background px-2 py-2 text-sm"
          value={value.level} onChange={(e) => onChange({ ...value, level: e.target.value })}>
          <option value="">대상 학년 (모르면 비워 두기)</option>
          {audienceLevels.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <Input inputMode="numeric" placeholder="인원" value={value.size}
          onChange={(e) => onChange({ ...value, size: e.target.value })} />
      </div>
      <Input placeholder="계열·사전지식 (예: 이과, 물리 아직 안 배움 / 공대 진학 희망)"
        value={value.note} onChange={(e) => onChange({ ...value, note: e.target.value })} />
      <p className="text-xs text-muted-foreground">
        평가자와 AI가 설명·용어 수준이 이 대상에게 맞았는지 판단하는 기준이에요. 모의 시연이면 상정한 대상을 적어 주세요.
      </p>
    </div>
  );
}
