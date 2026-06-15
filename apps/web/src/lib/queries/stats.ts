"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchProtocolStats } from "../api";

export function useProtocolStats() {
  return useQuery({
    queryKey: ["protocol-stats"],
    queryFn: fetchProtocolStats,
    refetchInterval: 30_000,
  });
}
