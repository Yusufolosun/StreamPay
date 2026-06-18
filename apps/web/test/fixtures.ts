/**
 * Typed test fixtures for @streampay/web.
 *
 * Factory functions that produce mock objects matching the real API types.
 */

import type { StreamView, StreamBalanceSnapshot, StreamNftInfo } from '../src/lib/api';
import type { NotificationEvent } from '../src/hooks/useNotifications';

// ── Constants ──────────────────────────────────────────────────────────

export const VALID_SP_ADDRESS = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
export const VALID_ST_ADDRESS = 'ST2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKQYAC0RQ';
export const MOCK_BNS_NAME = 'alice.btc';
export const MOCK_SENDER = 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE';
export const MOCK_RECIPIENT = VALID_SP_ADDRESS;
export const MOCK_TX_ID = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

// ── Stream Balance Snapshot ────────────────────────────────────────────

export function createMockBalanceSnapshot(
  overrides: Partial<StreamBalanceSnapshot> = {},
): StreamBalanceSnapshot {
  return {
    streamedBlocks: 100,
    effectiveBlock: 1100,
    streamedAmount: '500000000',
    cappedAmount: '500000000',
    withdrawnAmount: '200000000',
    claimableAmount: '300000000',
    remainingAmount: '500000000',
    ...overrides,
  };
}

// ── Stream View ────────────────────────────────────────────────────────

let streamIdCounter = 1;

export function createMockStreamView(
  overrides: Partial<StreamView> = {},
): StreamView {
  const id = String(streamIdCounter++);
  return {
    id,
    sender: MOCK_SENDER,
    recipient: MOCK_RECIPIENT,
    tokenContract: '',
    startBlock: 1000,
    currentBlock: 1100,
    ratePerBlock: '100000',
    fundedAmount: '1000000000',
    withdrawnAmount: '200000000',
    pausedAtBlock: null,
    cancelledAtBlock: null,
    status: 'active',
    balance: createMockBalanceSnapshot(),
    createdAt: Date.now() - 86400000,
    ...overrides,
  };
}

/** Convenience factories for specific statuses */
export const createActiveStream = (overrides: Partial<StreamView> = {}) =>
  createMockStreamView({ status: 'active', ...overrides });

export const createPausedStream = (overrides: Partial<StreamView> = {}) =>
  createMockStreamView({
    status: 'paused',
    pausedAtBlock: 1050,
    ...overrides,
  });

export const createCancelledStream = (overrides: Partial<StreamView> = {}) =>
  createMockStreamView({
    status: 'cancelled',
    cancelledAtBlock: 1080,
    ...overrides,
  });

export const createCompletedStream = (overrides: Partial<StreamView> = {}) =>
  createMockStreamView({ status: 'completed', ...overrides });

// ── Notification Event ─────────────────────────────────────────────────

let notifIdCounter = 1;

export function createMockNotification(
  overrides: Partial<NotificationEvent> = {},
): NotificationEvent {
  const id = `notif-${notifIdCounter++}`;
  return {
    id,
    type: 'stream_claimable',
    title: 'Claimable Balance Updated',
    message: 'Stream #1 has 0.5 STX available to claim.',
    streamId: '1',
    timestamp: Date.now() - 60000 * notifIdCounter,
    isRead: false,
    ...overrides,
  };
}

// ── Stream NFT ─────────────────────────────────────────────────────────

let nftIdCounter = 1;

export function createMockNft(
  overrides: Partial<StreamNftInfo> = {},
): StreamNftInfo {
  return {
    tokenId: nftIdCounter++,
    streamId: 1,
    receiptType: 'SENDER',
    mintedAt: Date.now() - 86400000,
    ...overrides,
  };
}

// ── Reset counters (call in beforeEach if needed) ──────────────────────

export function resetFixtureCounters(): void {
  streamIdCounter = 1;
  notifIdCounter = 1;
  nftIdCounter = 1;
}
