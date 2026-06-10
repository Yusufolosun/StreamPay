import { vi } from 'vitest';
import { mockStreams, mockMilestoneStreams } from '../fixtures.js';
import type { StreamIndexEntry, IndexedStreamView } from '../../src/services/streamIndexer.js';
import type { OnChainMilestoneStream, StreamEvent } from '../../src/types/stacks.js';

export class MockStacksService {
  public getHealth = vi.fn().mockResolvedValue({ reachable: true, blockHeight: 120 });
  public getCurrentBlockHeight = vi.fn().mockResolvedValue(120);
  public getMilestoneStreamIdNonce = vi.fn().mockResolvedValue(1);
  public getMilestoneStream = vi.fn().mockImplementation(async (id: number): Promise<OnChainMilestoneStream | null> => {
    return mockMilestoneStreams[id] || null;
  });
  public getStreamById = vi.fn().mockImplementation(async (id: number) => {
    const entry = mockStreams.find((s) => s.id === id);
    if (!entry) return null;
    return {
      sender: entry.sender,
      recipient: entry.recipient,
      tokenContract: entry.tokenContract || null,
      depositAmount: entry.depositAmount,
      ratePerBlock: entry.ratePerBlock,
      startBlock: entry.startBlock,
      endBlock: entry.endBlock,
      claimedAmount: entry.claimedAmount,
      isPaused: entry.isPaused,
      isCancelled: entry.isCancelled,
      createdAt: entry.createdAt,
    };
  });
  public getClaimableBalance = vi.fn().mockResolvedValue(0n);
  public getAddressStreams = vi.fn().mockImplementation(async (address: string) => {
    const sent = mockStreams.filter((s) => s.sender === address).map((s) => s.id);
    const received = mockStreams.filter((s) => s.recipient === address).map((s) => s.id);
    return { sent, received };
  });
  public getContractEvents = vi.fn().mockResolvedValue([]);
}

export class MockStreamIndexer {
  private cursor = 120;

  public getCursor = vi.fn().mockImplementation(() => this.cursor);
  public setCursor = (val: number) => { this.cursor = val; };
  public getIsRunning = vi.fn().mockReturnValue(true);
  public getHealth = vi.fn().mockImplementation(async () => ({
    status: 'ok' as const,
    cursor: this.cursor,
    tip: this.cursor,
    lag: 0,
  }));
  public getStream = vi.fn().mockImplementation((id: number): StreamIndexEntry | undefined => {
    return mockStreams.find((s) => s.id === id);
  });
  public getStreams = vi.fn().mockImplementation((): StreamIndexEntry[] => {
    return mockStreams;
  });
  public getSenderStreams = vi.fn().mockImplementation((sender: string): StreamIndexEntry[] => {
    return mockStreams.filter((s) => s.sender === sender);
  });
  public getRecipientStreams = vi.fn().mockImplementation((recipient: string): StreamIndexEntry[] => {
    return mockStreams.filter((s) => s.recipient === recipient);
  });
  public getStreamView = vi.fn().mockImplementation(async (id: number): Promise<IndexedStreamView | undefined> => {
    const entry = mockStreams.find((s) => s.id === id);
    if (!entry) return undefined;
    
    return {
      id: entry.id.toString(),
      sender: entry.sender,
      recipient: entry.recipient,
      tokenContract: entry.tokenContract,
      startBlock: entry.startBlock,
      currentBlock: this.cursor,
      ratePerBlock: entry.ratePerBlock,
      fundedAmount: entry.depositAmount,
      withdrawnAmount: entry.claimedAmount,
      pausedAtBlock: entry.pausedAtBlock,
      cancelledAtBlock: entry.cancelledAtBlock,
      status: entry.isCancelled ? 'cancelled' : entry.isPaused ? 'paused' : 'active',
      balance: {
        claimableAmount: 0n,
        remainingAmount: entry.depositAmount - entry.claimedAmount,
        withdrawnAmount: entry.claimedAmount,
      },
    };
  });
  public getStreamViews = vi.fn().mockImplementation(async (entries: StreamIndexEntry[]): Promise<IndexedStreamView[]> => {
    return Promise.all(entries.map((entry) => this.getStreamView(entry.id))) as Promise<IndexedStreamView[]>;
  });
  public getStreamHistory = vi.fn().mockImplementation((streamId: number): StreamEvent[] => {
    return [
      {
        eventType: 'stream-created',
        streamId,
        caller: 'SP2C578R0AER8Q81143TFEWCWJHXGYT4AK00SES79',
        blockHeight: 100,
        txId: '0xtesttxid',
        eventIndex: 0,
        depositAmount: 10000n,
        feeAmount: 50n,
      },
    ];
  });
  public getStreamCount = vi.fn().mockImplementation(() => mockStreams.length);
  public getActiveStreamCount = vi.fn().mockImplementation(() => {
    return mockStreams.filter((s) => !s.isPaused && !s.isCancelled).length;
  });
  public getTotalVolume = vi.fn().mockImplementation(() => {
    return mockStreams.reduce((acc, s) => acc + s.depositAmount, 0n);
  });
  public getIsProtocolPaused = vi.fn().mockReturnValue(false);
}
