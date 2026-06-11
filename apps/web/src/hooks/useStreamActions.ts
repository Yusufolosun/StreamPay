"use client";

import { useCallback } from "react";
import { useContractCall } from "./useContractCall";
import { useToast } from "../components/Toast";
import {
  buildPauseStream,
  buildResumeStream,
  buildCancelStream,
  buildClaimStream,
} from "../lib/transactions";

/**
 * Encapsulates stream lifecycle actions (pause, resume, cancel, claim)
 * with toast notifications and loading states.
 */
export function useStreamActions(onSuccess?: () => void) {
  const { isLoading, execute, reset } = useContractCall();
  const toast = useToast();

  const pause = useCallback(
    async (streamId: number) => {
      reset();
      const tx = buildPauseStream(streamId);
      const txId = await execute(tx);
      if (txId) {
        toast.success("Stream paused successfully.", txId);
        onSuccess?.();
      }
    },
    [execute, reset, toast, onSuccess]
  );

  const resume = useCallback(
    async (streamId: number) => {
      reset();
      const tx = buildResumeStream(streamId);
      const txId = await execute(tx);
      if (txId) {
        toast.success("Stream resumed successfully.", txId);
        onSuccess?.();
      }
    },
    [execute, reset, toast, onSuccess]
  );

  const cancel = useCallback(
    async (streamId: number) => {
      reset();
      const tx = buildCancelStream(streamId);
      const txId = await execute(tx);
      if (txId) {
        toast.success("Stream cancelled successfully.", txId);
        onSuccess?.();
      }
    },
    [execute, reset, toast, onSuccess]
  );

  const claim = useCallback(
    async (streamId: number) => {
      reset();
      const tx = buildClaimStream(streamId);
      const txId = await execute(tx);
      if (txId) {
        toast.success("Funds claimed successfully.", txId);
        onSuccess?.();
      }
    },
    [execute, reset, toast, onSuccess]
  );

  return { isLoading, pause, resume, cancel, claim };
}

export default useStreamActions;
