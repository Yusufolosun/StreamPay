"use client";

import { useQuery } from "@tanstack/react-query";
import { callReadOnlyFunction, uintCV, cvToJSON } from "@stacks/transactions";
import { useStreamPay } from "../app/providers";

const STREAM_CONDITIONS =
  process.env.NEXT_PUBLIC_STREAM_CONDITIONS_ADDRESS ??
  "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.stream-conditions";

export function useMilestoneDisputes(streamId: number | undefined, milestonesCount: number) {
  const { network } = useStreamPay();

  return useQuery({
    queryKey: ["milestoneDisputes", streamId, milestonesCount],
    queryFn: async () => {
      if (streamId === undefined || milestonesCount <= 0) return [];
      const disputes: boolean[] = [];
      const [contractAddress, contractName] = STREAM_CONDITIONS.split(".");

      for (let i = 0; i < milestonesCount; i++) {
        try {
          const responseCV = await callReadOnlyFunction({
            contractAddress,
            contractName,
            functionName: "get-dispute",
            functionArgs: [uintCV(streamId), uintCV(i)],
            senderAddress: contractAddress, // arbitrary sender
            network,
          });

          // responseCV is a Clarity optional CV. If it's a some, we extract the tuple, else false.
          const jsonVal: any = cvToJSON(responseCV);
          if (jsonVal && jsonVal.type === "optional" && jsonVal.value) {
            // it is some CV (tuple with is-active: bool)
            const isActive = jsonVal.value.value?.["is-active"]?.value === true;
            disputes.push(isActive);
          } else {
            disputes.push(false);
          }
        } catch (err) {
          console.error(`Error fetching dispute status for stream ${streamId} milestone ${i}:`, err);
          disputes.push(false);
        }
      }
      return disputes;
    },
    enabled: streamId !== undefined && milestonesCount > 0,
    staleTime: 1000 * 10, // 10 seconds cache
    refetchInterval: 10000, // 10s auto-refresh
  });
}

export default useMilestoneDisputes;
