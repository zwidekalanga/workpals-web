"use client";

import { queryKeys } from "@/data/constants";
import { apiFetch } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  subscription_tier: string;
  usage: {
    analyses_used: number;
    analyses_limit: number;
    period_start?: string;
  };
}

export default function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile(),
    queryFn: () => apiFetch<Profile>("/api/profile"),
    staleTime: 5 * 60_000,
  });
}
