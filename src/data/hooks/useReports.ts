"use client";

import { queryKeys } from "@/data/constants";
import { listReports } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

export default function useReports() {
  return useQuery({
    queryKey: queryKeys.reportsList(),
    queryFn: listReports,
  });
}
