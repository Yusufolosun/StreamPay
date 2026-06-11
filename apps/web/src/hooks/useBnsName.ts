import { useQuery } from "@tanstack/react-query";

/**
 * Resolves a Stacks address to its registered BNS name (e.g. .btc) if available.
 */
export function useBnsName(address: string | null | undefined) {
  return useQuery({
    queryKey: ["bnsName", address],
    queryFn: async () => {
      if (!address) return null;
      try {
        const apiUrl = process.env.NEXT_PUBLIC_HIRO_API_URL || "http://localhost:3999";
        const res = await fetch(`${apiUrl}/v1/addresses/stacks/${address}/names`);
        if (res.ok) {
          const data = await res.json();
          return (data.names?.[0] as string) || null;
        }
      } catch (e) {
        console.error("Failed to fetch BNS names for address", address, e);
      }
      return null;
    },
    enabled: !!address,
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  });
}

export default useBnsName;
