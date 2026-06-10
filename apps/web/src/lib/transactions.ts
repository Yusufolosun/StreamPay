/* -----------------------------------------------------------------------
 * StreamPay — Transaction Builders
 *
 * Typed functions that return ContractCallOptions for @stacks/connect
 * openContractCall. No private keys on the server — all signing happens
 * in the user's browser wallet.
 * ----------------------------------------------------------------------- */

import {
  uintCV,
  principalCV,
  contractPrincipalCV,
  stringAsciiCV,
  boolCV,
  noneCV,
  someCV,
  tupleCV,
  listCV,
  optionalCVOf,
} from "@stacks/transactions";
import type { ClarityValue } from "@stacks/transactions";

import type {
  CreateStreamParams,
  CreateMilestoneStreamParams,
} from "./types";

// ── Contract addresses from env ────────────────────────────────────────

const STREAM_CORE =
  process.env.NEXT_PUBLIC_STREAM_CORE_ADDRESS ??
  "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.stream-core";

const STREAM_CONDITIONS =
  process.env.NEXT_PUBLIC_STREAM_CONDITIONS_ADDRESS ??
  "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.stream-conditions";

function splitContractId(contractId: string): {
  contractAddress: string;
  contractName: string;
} {
  const [contractAddress, contractName] = contractId.split(".");
  return { contractAddress, contractName };
}

// ── Helpers ────────────────────────────────────────────────────────────

function buildTokenContractCV(tokenContract?: string): ClarityValue {
  if (!tokenContract) return noneCV();
  const [addr, name] = tokenContract.split(".");
  return someCV(contractPrincipalCV(addr, name));
}

// ── Contract Call Options type ─────────────────────────────────────────

export interface ContractCallTransaction {
  contractAddress: string;
  contractName: string;
  functionName: string;
  functionArgs: ClarityValue[];
}

// ── Stream Core Builders ───────────────────────────────────────────────

export function buildCreateStream(
  params: CreateStreamParams,
): ContractCallTransaction {
  const { contractAddress, contractName } = splitContractId(STREAM_CORE);

  return {
    contractAddress,
    contractName,
    functionName: "create-stream",
    functionArgs: [
      principalCV(params.recipient),
      uintCV(params.amount),
      uintCV(params.ratePerBlock),
      uintCV(params.durationBlocks),
      buildTokenContractCV(params.tokenContract),
    ],
  };
}

export function buildClaimStream(
  streamId: number,
): ContractCallTransaction {
  const { contractAddress, contractName } = splitContractId(STREAM_CORE);
  return {
    contractAddress,
    contractName,
    functionName: "claim-stream",
    functionArgs: [uintCV(streamId)],
  };
}

export function buildPauseStream(
  streamId: number,
): ContractCallTransaction {
  const { contractAddress, contractName } = splitContractId(STREAM_CORE);
  return {
    contractAddress,
    contractName,
    functionName: "pause-stream",
    functionArgs: [uintCV(streamId)],
  };
}

export function buildResumeStream(
  streamId: number,
): ContractCallTransaction {
  const { contractAddress, contractName } = splitContractId(STREAM_CORE);
  return {
    contractAddress,
    contractName,
    functionName: "resume-stream",
    functionArgs: [uintCV(streamId)],
  };
}

export function buildCancelStream(
  streamId: number,
): ContractCallTransaction {
  const { contractAddress, contractName } = splitContractId(STREAM_CORE);
  return {
    contractAddress,
    contractName,
    functionName: "cancel-stream",
    functionArgs: [uintCV(streamId)],
  };
}

// ── Milestone Builders ─────────────────────────────────────────────────

export function buildCreateMilestoneStream(
  params: CreateMilestoneStreamParams,
): ContractCallTransaction {
  const { contractAddress, contractName } = splitContractId(STREAM_CONDITIONS);

  const milestonesCVList = listCV(
    params.milestones.map((m) =>
      tupleCV({
        label: stringAsciiCV(m.label),
        "basis-points": uintCV(m.basisPoints),
        "is-released": boolCV(false),
        "released-at": noneCV(),
      }),
    ),
  );

  const arbiterCV = params.arbiter
    ? someCV(principalCV(params.arbiter))
    : noneCV();

  return {
    contractAddress,
    contractName,
    functionName: "create-milestone-stream",
    functionArgs: [
      principalCV(params.recipient),
      uintCV(params.totalAmount),
      buildTokenContractCV(params.tokenContract),
      milestonesCVList,
      arbiterCV,
    ],
  };
}

export function buildReleaseMilestone(
  milestoneStreamId: number,
  milestoneIndex: number,
): ContractCallTransaction {
  const { contractAddress, contractName } = splitContractId(STREAM_CONDITIONS);
  return {
    contractAddress,
    contractName,
    functionName: "release-milestone",
    functionArgs: [uintCV(milestoneStreamId), uintCV(milestoneIndex)],
  };
}

export function buildDisputeMilestone(
  milestoneStreamId: number,
  milestoneIndex: number,
): ContractCallTransaction {
  const { contractAddress, contractName } = splitContractId(STREAM_CONDITIONS);
  return {
    contractAddress,
    contractName,
    functionName: "dispute-milestone",
    functionArgs: [uintCV(milestoneStreamId), uintCV(milestoneIndex)],
  };
}
