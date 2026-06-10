import type { StreamIndexEntry } from '../src/services/streamIndexer.js';
import type { OnChainMilestoneStream } from '../src/types/stacks.js';

export const mockStreams: StreamIndexEntry[] = [
  {
    id: 1,
    sender: 'SP2C578R0AER8Q81143TFEWCWJHXGYT4AK00SES79',
    recipient: 'SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    tokenContract: 'SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sip-010-token',
    depositAmount: 10000n,
    ratePerBlock: 10n,
    startBlock: 100,
    endBlock: 1100,
    claimedAmount: 100n,
    pausedAtBlock: null,
    cancelledAtBlock: null,
    isPaused: false,
    isCancelled: false,
    createdAt: 1620000000,
  },
  {
    id: 2,
    sender: 'SP2C578R0AER8Q81143TFEWCWJHXGYT4AK00SES79',
    recipient: 'SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    tokenContract: 'SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sip-010-token',
    depositAmount: 5000n,
    ratePerBlock: 5n,
    startBlock: 200,
    endBlock: 1200,
    claimedAmount: 50n,
    pausedAtBlock: 250,
    cancelledAtBlock: null,
    isPaused: true,
    isCancelled: false,
    createdAt: 1620000100,
  },
  {
    id: 3,
    sender: 'SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    recipient: 'SP2C578R0AER8Q81143TFEWCWJHXGYT4AK00SES79',
    tokenContract: 'SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sip-010-token',
    depositAmount: 2000n,
    ratePerBlock: 2n,
    startBlock: 300,
    endBlock: 1300,
    claimedAmount: 0n,
    pausedAtBlock: null,
    cancelledAtBlock: 400,
    isPaused: false,
    isCancelled: true,
    createdAt: 1620000200,
  },
];

export const mockMilestoneStreams: Record<number, OnChainMilestoneStream> = {
  1: {
    sender: 'SP2C578R0AER8Q81143TFEWCWJHXGYT4AK00SES79',
    recipient: 'SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    arbiter: 'SP2ANPCGYA3YB7SMYQ7JBS35S88349RADBFGG78Y4',
    totalAmount: 10000n,
    tokenContract: 'SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sip-010-token',
    milestones: [
      { label: 'M1', basisPoints: 3000, isReleased: true, releasedAt: 105 },
      { label: 'M2', basisPoints: 7000, isReleased: false, releasedAt: null },
    ],
    isCancelled: false,
    createdAt: 1620000200,
  },
};
