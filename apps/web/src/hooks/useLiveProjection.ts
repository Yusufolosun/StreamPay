"use client";

import { useState, useEffect } from "react";
import { BLOCKS_PER_DAY } from "../lib/constants";

/**
 * Projects the live streamed balance for a single active stream,
 * incrementing every second based on the rate per block.
 * ~10 min per block = 600 seconds per block.
 */
export function useLiveProjection(opts: {
  status: string;
  claimedAmount: number;
  ratePerBlock: number;
  fundedAmount: number;
}) {
  const { status, claimedAmount, ratePerBlock, fundedAmount } = opts;
  const [projected, setProjected] = useState(claimedAmount);

  useEffect(() => {
    setProjected(claimedAmount);

    if (status !== "active" || ratePerBlock <= 0) return;

    const interval = setInterval(() => {
      setProjected((prev) => {
        // ~600 seconds per block
        const increment = ratePerBlock / 600;
        return Math.min(prev + increment, fundedAmount);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status, claimedAmount, ratePerBlock, fundedAmount]);

  return projected;
}

export default useLiveProjection;
