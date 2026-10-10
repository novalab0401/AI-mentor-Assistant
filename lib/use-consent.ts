"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { PRIVACY_VERSION, TERMS_VERSION } from "./legal";

// 로그인한 사람이 현재 버전 약관·처리방침에 동의했는지 확인하고, 안 했으면 동의 화면으로 보내요
export function useConsentGuard(user: User | null | undefined) {
  const router = useRouter();
  const [ok, setOk] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_consents")
      .select("id")
      .eq("user_id", user.id)
      .eq("terms_version", TERMS_VERSION)
      .eq("privacy_version", PRIVACY_VERSION)
      .limit(1)
      .then(({ data, error }) => {
        // 표가 아직 없으면(SQL 실행 전) 막지 않아요
        const agreed = !!error || (data ?? []).length > 0;
        setOk(agreed);
        // 동의 후 원래 보던 화면으로 돌아오도록 지금 주소를 넘겨요
        if (!agreed) router.replace(`/consent?next=${encodeURIComponent(window.location.pathname)}`);
      });
  }, [user, router]);

  return ok;
}
