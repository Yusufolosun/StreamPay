"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchStreams, fetchStream, fetchStreamHistory, fetchStreamBalance } from "../api";
import { openContractCall } from "@stacks/connect";
import { useStreamPay } from "../../app/providers";
import {
  buildCreateStream,
  buildClaimStream,
  buildPauseStream,
  buildResumeStream,
  buildCancelStream,
} from "../transactions";
import type { StreamView, CreateStreamParams } from "../types";

export function useSenderStreams(address: string | null) {
  return useQuery({
    queryKey: ["sender-streams", address],
    queryFn: async () => {
      if (!address) return { data: [] as StreamView[], pagination: undefined };
      const res = await fetchStreams({ sender: address, limit: 100 });
      return res;
    },
    enabled: !!address,
  });
}
