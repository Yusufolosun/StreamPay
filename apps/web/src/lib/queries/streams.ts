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

export function useStreamHistory(streamId: number | null) {
  return useQuery({
    queryKey: ["stream-history", streamId],
    queryFn: async () => {
      if (streamId === null || isNaN(streamId)) return [];
      return fetchStreamHistory(streamId);
    },
    enabled: streamId !== null && !isNaN(streamId),
  });
}

export function useStreamBalance(streamId: number | null) {
  return useQuery({
    queryKey: ["stream-balance", streamId],
    queryFn: async () => {
      if (streamId === null || isNaN(streamId)) return null;
      return fetchStreamBalance(streamId);
    },
    enabled: streamId !== null && !isNaN(streamId),
    refetchInterval: 10000,
  });
}

export function useCreateStream() {
  const queryClient = useQueryClient();
  const { network, address } = useStreamPay();

  return useMutation({
    mutationFn: async (params: CreateStreamParams) => {
      const tx = buildCreateStream(params);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sender-streams", address] });
    },
  });
}

export function useClaimStream() {
  const queryClient = useQueryClient();
  const { network, address } = useStreamPay();

  return useMutation({
    mutationFn: async ({ streamId }: { streamId: number }) => {
      const tx = buildClaimStream(streamId);
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
    onMutate: async ({ streamId }) => {
      await queryClient.cancelQueries({ queryKey: ["stream-balance", streamId] });
      const previousBalance = queryClient.getQueryData(["stream-balance", streamId]);
      queryClient.setQueryData(["stream-balance", streamId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          claimable: "0",
        };
      });
      return { previousBalance };
    },
    onError: (err, { streamId }, context: any) => {
      if (context?.previousBalance) {
        queryClient.setQueryData(["stream-balance", streamId], context.previousBalance);
      }
    },
    onSettled: (data, error, { streamId }) => {
      queryClient.invalidateQueries({ queryKey: ["stream-balance", streamId] });
      queryClient.invalidateQueries({ queryKey: ["stream", streamId] });
      queryClient.invalidateQueries({ queryKey: ["recipient-streams", address] });
    },
  });
}

export function usePauseStream() {
  const queryClient = useQueryClient();
  const { network } = useStreamPay();

  return useMutation({
    mutationFn: async ({ streamId }: { streamId: number }) => {
      const tx = buildPauseStream(streamId);
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
    onMutate: async ({ streamId }) => {
      await queryClient.cancelQueries({ queryKey: ["stream", streamId] });
      const previousStream = queryClient.getQueryData(["stream", streamId]);
      queryClient.setQueryData(["stream", streamId], (old: any) => {
        if (!old || !old.stream) return old;
        return {
          ...old,
          stream: {
            ...old.stream,
            status: "paused",
            pausedAtBlock: old.stream.currentBlock || 1,
          },
        };
      });
      return { previousStream };
    },
    onError: (err, { streamId }, context: any) => {
      if (context?.previousStream) {
        queryClient.setQueryData(["stream", streamId], context.previousStream);
      }
    },
    onSettled: (data, error, { streamId }) => {
      queryClient.invalidateQueries({ queryKey: ["stream", streamId] });
    },
  });
}

export function useResumeStream() {
  const queryClient = useQueryClient();
  const { network } = useStreamPay();

  return useMutation({
    mutationFn: async ({ streamId }: { streamId: number }) => {
      const tx = buildResumeStream(streamId);
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
    onSuccess: (data, { streamId }) => {
      queryClient.invalidateQueries({ queryKey: ["stream", streamId] });
    },
  });
}
