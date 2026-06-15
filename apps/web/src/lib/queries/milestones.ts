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
