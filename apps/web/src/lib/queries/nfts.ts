"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchNfts } from "../api";

export function useNftsByOwner(address: string | null) {
  return useQuery({
    queryKey: ["nfts-by-owner", address],
    queryFn: async () => {
      if (!address) return [];
      return fetchNfts(address);
    },
    enabled: !!address,
  });
}
