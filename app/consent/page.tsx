"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import ConsentChecklist from "@/components/consent-checklist";
import { supabase } from "@/lib/supabase";
import { PRIVACY_VERSION, TERMS_VERSION, emptyConsent, requiredOk } from "@/lib/legal";

// 이미 가입한 사람이 (새) 약관·처리방침에 동의하는 화면
export default function ConsentPage() {
  const router = useRouter();
  const [consent, setConsent] = useState(emptyConsent);
  const [busy, setBusy] = useState(false);

  async function agree() {
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setBusy(false);
      return router.replace("/login");
    }
    const { error } = await supabase.from("user_consents").insert({
      user_id: auth.user.id,
      terms_version: TERMS_VERSION,
      privacy_version: PRIVACY_VERSION,
      research_opt_in: consent.research,
    });
    setBusy(false);
    if (error) return alert("저장 실패: " + error.message);
    const next = new URLSearchParams(window.location.search).get("next");
    router.replace(next && next.startsWith("/") ? next : "/");
  }

  async function decline() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  return (
    <main className="mx-auto max-w-md space-y-4 p-4 pt-10">
      <div>
        <h1 className="text-xl font-bold">약관 동의</h1>
        <p className="text-sm text-muted-foreground">
          서비스를 계속 이용하려면 이용약관과 개인정보 처리방침에 동의해 주세요.
        </p>
      </div>
      <ConsentChecklist value={consent} onChange={setConsent} />
      <Button className="w-full" disabled={busy || !requiredOk(consent)} onClick={agree}>
        {busy ? "저장 중..." : "동의하고 계속하기"}
      </Button>
      <button onClick={decline} className="w-full text-center text-xs text-muted-foreground underline">
        동의하지 않고 로그아웃
      </button>
    </main>
  );
}
