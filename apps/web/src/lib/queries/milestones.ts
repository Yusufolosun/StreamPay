"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchMilestoneStream, fetchMilestoneStreams } from "../api";
import { openContractCall } from "@stacks/connect";
import { useStreamPay } from "../../app/providers";
import { buildReleaseMilestone } from "../transactions";
import type { MilestoneStream } from "../types";

export function useMilestoneStream(id: number | null) {
  return useQuery({
    queryKey: ["milestone-stream", id],
    queryFn: async () => {
      if (id === null || isNaN(id)) return null;
      return fetchMilestoneStream(id);
    },
    enabled: id !== null && !isNaN(id),
  });
}

export function useMilestonesByAddress(address: string | null, role: "sender" | "recipient") {
  return useQuery({
    queryKey: ["milestones-by-address", address, role],
    queryFn: async () => {
      if (!address) return { data: [] as MilestoneStream[], pagination: undefined };
      const params = role === "sender" ? { sender: address } : { recipient: address };
      return fetchMilestoneStreams(params);
    },
    enabled: !!address,
  });
}

export function useReleaseMilestone() {
  const queryClient = useQueryClient();
  const { network } = useStreamPay();

  return useMutation({
    mutationFn: async ({ milestoneStreamId, milestoneIndex }: { milestoneStreamId: number; milestoneIndex: number }) => {
      const tx = buildReleaseMilestone(milestoneStreamId, milestoneIndex);
      return new Promise<string>((resolve, reject) => {
        openContractCall({
          ...tx,
          network,
          onFinish: (data) => {
            const txId = data?.txId || data?.txid || "";
            resolve(txId);
          },
          onCancel: () => {
            reject(new Error("Transaction cancelled by user"));
          },
        });
      });
    },
    onSuccess: (data, { milestoneStreamId }) => {
      queryClient.invalidateQueries({ queryKey: ["milestone-stream", milestoneStreamId] });
    },
  });
}
