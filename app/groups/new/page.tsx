"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import BackLink from "@/components/back-link";
import { supabase } from "@/lib/supabase";
import { canCreateGroup, usePermissions } from "@/lib/use-permissions";

// Nova Lab 관리자가 그룹을 만들고 그룹장을 지정해요
export default function NewGroupPage() {
  const router = useRouter();
  const perm = usePermissions(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_create_group", {
      p_name: name,
      p_description: description,
      p_owner_email: ownerEmail,
    });
    setBusy(false);
    if (error) return alert("만들기 실패: " + error.message);
    router.push(`/groups/${data}`);
  }

  if (perm && !canCreateGroup(perm)) {
    return (
      <main className="mx-auto max-w-md space-y-4 p-4">
        <BackLink href="/" label="내 그룹" />
        <p className="rounded-md bg-muted p-3 text-sm">
          그룹은 Nova Lab이 만들어 드려요. 서비스 이용을 원하시면 Nova Lab으로 문의해 주세요.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md space-y-4 p-4">
      <BackLink href="/admin" label="Nova Lab 관리자" />
      <div>
        <h1 className="text-xl font-bold">새 그룹 만들기</h1>
        <p className="text-sm text-muted-foreground">
          구독한 단체의 그룹을 만들고 그룹장을 지정해요. 그룹장은 먼저 이 사이트에 회원가입해 있어야 해요.
          그룹 삭제는 Nova Lab만 할 수 있어요.
        </p>
      </div>
      <Input placeholder="그룹 이름 (예: 한국대학생멘토연합)" value={name}
        onChange={(e) => setName(e.target.value)} />
      <Textarea placeholder="소개 (선택)" value={description}
        onChange={(e) => setDescription(e.target.value)} />
      <Input type="email" placeholder="그룹장 이메일 (가입한 이메일)" value={ownerEmail}
        onChange={(e) => setOwnerEmail(e.target.value)} />
      <Button className="w-full" disabled={busy || name.trim() === "" || ownerEmail.trim() === ""}
        onClick={handleCreate}>
        {busy ? "만드는 중..." : "그룹 만들고 그룹장 지정"}
      </Button>
    </main>
  );
}
