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

export function useRecipientStreams(address: string | null) {
  return useQuery({
    queryKey: ["recipient-streams", address],
    queryFn: async () => {
      if (!address) return { data: [] as StreamView[], pagination: undefined };
      const res = await fetchStreams({ recipient: address, limit: 100 });
      return res;
    },
    enabled: !!address,
  });
}

export function useStream(streamId: number | null) {
  return useQuery({
    queryKey: ["stream", streamId],
    queryFn: async () => {
      if (streamId === null || isNaN(streamId)) return null;
      return fetchStream(streamId);
    },
    enabled: streamId !== null && !isNaN(streamId),
  });
}
