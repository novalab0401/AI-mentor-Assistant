"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import BackLink from "@/components/back-link";
import { supabase } from "@/lib/supabase";
import { canCreateGroup, usePermissions } from "@/lib/use-permissions";

export default function NewGroupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const perm = usePermissions(true);

  async function handleCreate() {
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("groups")
      .insert({ name: name.trim(), description: description.trim() || null, created_by: auth.user!.id })
      .select("id")
      .single();
    setBusy(false);
    if (error) return alert("만들기 실패: " + error.message);
    router.push(`/groups/${data.id}`);
  }

  return (
    <main className="mx-auto max-w-md space-y-4 p-4">
      <BackLink href="/" label="내 그룹" />
      <div>
        <h1 className="text-xl font-bold">새 그룹 만들기</h1>
        <p className="text-sm text-muted-foreground">
          만든 사람이 첫 운영진이 돼요. 다른 사람은 가입 신청 후 운영진 승인을 받아 들어와요.
        </p>
      </div>
      {perm && !canCreateGroup(perm) && (
        <p className="rounded-md bg-muted p-3 text-sm">
          그룹 만들기는 Nova Lab 서비스를 이용하는 단체에 제공돼요. 이용 문의는 Nova Lab으로 연락해 주세요.
          {perm.group_quota > 0 && ` (만들 수 있는 그룹 ${perm.group_quota}개를 모두 사용했어요)`}
        </p>
      )}
      <Input placeholder="그룹 이름 (예: UNIST 기계공학과 멘토단 2027)" value={name}
        onChange={(e) => setName(e.target.value)} />
      <Textarea placeholder="소개 (선택)" value={description}
        onChange={(e) => setDescription(e.target.value)} />
      <Button className="w-full" disabled={busy || name.trim() === "" || !canCreateGroup(perm)} onClick={handleCreate}>
        {busy ? "만드는 중..." : "그룹 만들기"}
      </Button>
    </main>
  );
}
