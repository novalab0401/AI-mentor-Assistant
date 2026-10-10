"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export type Permissions = {
  is_platform_admin: boolean;
  group_quota: number;
  groups_created: number;
};

// 내 권한: Nova Lab 관리자인지, 그룹을 몇 개 더 만들 수 있는지
export function usePermissions(enabled: boolean) {
  const [perm, setPerm] = useState<Permissions | null>(null);
  useEffect(() => {
    if (!enabled) return;
    supabase.rpc("my_permissions").then(({ data }) => {
      setPerm(((data as Permissions[] | null) ?? [])[0] ?? null);
    });
  }, [enabled]);
  return perm;
}

// 그룹은 Nova Lab 관리자가 만들어서 그룹장에게 넘겨줘요
export function canCreateGroup(p: Permissions | null) {
  return !!p && p.is_platform_admin;
}
