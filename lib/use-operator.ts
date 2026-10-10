"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

// 지금 로그인한 운영자를 알려 줘요.
// undefined = 확인 중, null = 로그인 안 함, User = 로그인한 운영자
export function useOperator() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    // 로그인·로그아웃이 일어나면 바로 반영
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setUser(session?.user ?? null)
    );
    return () => data.subscription.unsubscribe();
  }, []);

  return user;
}
