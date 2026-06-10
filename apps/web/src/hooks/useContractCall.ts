"use client";

import { useState, useCallback } from "react";
import { openContractCall } from "@stacks/connect";
import { useQueryClient } from "@tanstack/react-query";
import { useStreamPay } from "../app/providers";
import { parseContractError } from "../lib/types";
import type { ContractCallTransaction } from "../lib/transactions";

export interface ContractCallState {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: string | null;
  txId: string | null;
}

export interface UseContractCallReturn extends ContractCallState {
  execute: (tx: ContractCallTransaction) => Promise<string | null>;
  reset: () => void;
}

const initialState: ContractCallState = {
  isLoading: false,
  isSuccess: false,
  isError: false,
  error: null,
  txId: null,
};

/**
 * Wraps @stacks/connect openContractCall with loading state, error
 * parsing via ERROR_MESSAGES, React Query cache invalidation on success,
 * and toast-style state for UI consumption.
 */
export function useContractCall(): UseContractCallReturn {
  const [state, setState] = useState<ContractCallState>(initialState);
  const queryClient = useQueryClient();
  const { network } = useStreamPay();

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const execute = useCallback(
    async (tx: ContractCallTransaction): Promise<string | null> => {
      setState({ ...initialState, isLoading: true });

      try {
        return await new Promise<string | null>((resolve, reject) => {
          openContractCall({
            contractAddress: tx.contractAddress,
            contractName: tx.contractName,
            functionName: tx.functionName,
            functionArgs: tx.functionArgs,
            network,
            onFinish: (data: any) => {
              const txId = data?.txId || data?.txid || null;
              setState({
                isLoading: false,
                isSuccess: true,
                isError: false,
                error: null,
                txId,
              });

              // Invalidate relevant queries so the UI refreshes
              queryClient.invalidateQueries({ queryKey: ["streams"] });
              queryClient.invalidateQueries({ queryKey: ["milestoneStreams"] });

              resolve(txId);
            },
            onCancel: () => {
              setState({
                isLoading: false,
                isSuccess: false,
                isError: true,
                error: "Transaction was cancelled.",
                txId: null,
              });
              resolve(null);
            },
          });
        });
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? parseContractError(err.message)
            : "An unexpected error occurred while submitting the transaction.";

        setState({
          isLoading: false,
          isSuccess: false,
          isError: true,
          error: message,
          txId: null,
        });

        return null;
      }
    },
    [network, queryClient],
  );

  return { ...state, execute, reset };
}
export default useContractCall;
