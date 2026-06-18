/**
 * StreamCard component tests.
 *
 * Covers: metadata rendering, status badges, expand/collapse,
 * action button visibility, and Pause contract call.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import {
  createActiveStream,
  createPausedStream,
  createCancelledStream,
  createCompletedStream,
  resetFixtureCounters,
  MOCK_RECIPIENT,
} from '../fixtures';

// ── Hoist mocks ────────────────────────────────────────────────────────

const mockExecute = vi.fn().mockResolvedValue('mock-tx-id');
const mockReset = vi.fn();

vi.mock('../../src/hooks/useContractCall', () => ({
  useContractCall: () => ({
    isLoading: false,
    isSuccess: false,
    isError: false,
    error: null,
    txId: null,
    execute: mockExecute,
    reset: mockReset,
  }),
  default: () => ({
    isLoading: false,
    isSuccess: false,
    isError: false,
    error: null,
    txId: null,
    execute: mockExecute,
    reset: mockReset,
  }),
}));

vi.mock('../../src/components/Toast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

vi.mock('../../src/components/AddressDisplay', () => ({
  AddressDisplay: ({ address }: { address: string }) => (
    <span data-testid="address-display">{address.slice(0, 6)}...{address.slice(-4)}</span>
  ),
}));

vi.mock('../../src/components/ui/BottomSheet', () => ({
  BottomSheet: ({ children, isOpen }: any) =>
    isOpen ? <div data-testid="bottom-sheet">{children}</div> : null,
}));

// ── Import component after mocks ───────────────────────────────────────

import { StreamCard } from '../../src/components/dashboard/StreamCard';

// ── Test Suite ─────────────────────────────────────────────────────────

describe('StreamCard', () => {
  const onActionSuccess = vi.fn();

  beforeEach(() => {
    resetFixtureCounters();
    vi.clearAllMocks();
    // Mock window.innerWidth for desktop
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
  });

  describe('Rendering & Metadata', () => {
    it('renders recipient address display', () => {
      const stream = createActiveStream();
      render(<StreamCard stream={stream} onActionSuccess={onActionSuccess} />);

      const addressEl = screen.getByTestId('address-display');
      expect(addressEl).toBeInTheDocument();
    });

    it('renders rate per block and funded amount info', () => {
      const stream = createActiveStream({
        ratePerBlock: '100000',
        fundedAmount: '1000000000',
      });
      render(<StreamCard stream={stream} onActionSuccess={onActionSuccess} />);

      // Rate per block is 0.100000 STX
      expect(screen.getByText(/0\.100000\/block/)).toBeInTheDocument();
    });

    it('renders "Streamed so far" label', () => {
      const stream = createActiveStream();
      render(<StreamCard stream={stream} onActionSuccess={onActionSuccess} />);
      expect(screen.getByText('Streamed so far')).toBeInTheDocument();
    });
  });

  describe('Status Badges', () => {
    it('shows "Active" badge for active stream', () => {
      const stream = createActiveStream();
      render(<StreamCard stream={stream} onActionSuccess={onActionSuccess} />);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('shows "Paused" badge for paused stream', () => {
      const stream = createPausedStream();
      render(<StreamCard stream={stream} onActionSuccess={onActionSuccess} />);
      expect(screen.getByText('Paused')).toBeInTheDocument();
    });

    it('shows "Cancelled" badge for cancelled stream', () => {
      const stream = createCancelledStream();
      render(<StreamCard stream={stream} onActionSuccess={onActionSuccess} />);
      expect(screen.getByText('Cancelled')).toBeInTheDocument();
    });

    it('shows "Expired" badge for completed stream', () => {
      const stream = createCompletedStream();
      render(<StreamCard stream={stream} onActionSuccess={onActionSuccess} />);
      expect(screen.getByText('Expired')).toBeInTheDocument();
    });

    it('applies green color class for active status', () => {
      const stream = createActiveStream();
      render(<StreamCard stream={stream} onActionSuccess={onActionSuccess} />);
      const badge = screen.getByText('Active');
      expect(badge.className).toContain('text-green-400');
    });

    it('applies yellow color class for paused status', () => {
      const stream = createPausedStream();
      render(<StreamCard stream={stream} onActionSuccess={onActionSuccess} />);
      const badge = screen.getByText('Paused');
      expect(badge.className).toContain('text-yellow-400');
    });
  });

  describe('Expand & Actions', () => {
    it('expand button reveals detail grid with Stream ID', async () => {
      const stream = createActiveStream({ id: '42' });
      render(<StreamCard stream={stream} onActionSuccess={onActionSuccess} />);

      // Detail grid should not be visible initially
      expect(screen.queryByText('Stream ID')).not.toBeInTheDocument();

      // Click "Details" button
      const detailsBtn = screen.getByText('Details');
      await userEvent.click(detailsBtn);

      // Now detail grid should be visible
      expect(screen.getByText('Stream ID')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('Start Block')).toBeInTheDocument();
      expect(screen.getByText('Total Funded')).toBeInTheDocument();
      expect(screen.getByText('Total Claimed')).toBeInTheDocument();
    });

    it('Pause button is present for active stream when expanded', async () => {
      const stream = createActiveStream();
      render(<StreamCard stream={stream} onActionSuccess={onActionSuccess} />);

      await userEvent.click(screen.getByText('Details'));

      expect(screen.getByText('Pause')).toBeInTheDocument();
    });

    it('Pause button is absent for cancelled stream when expanded', async () => {
      const stream = createCancelledStream();
      render(<StreamCard stream={stream} onActionSuccess={onActionSuccess} />);

      await userEvent.click(screen.getByText('Details'));

      expect(screen.queryByText('Pause')).not.toBeInTheDocument();
    });

    it('Resume button is present for paused stream when expanded', async () => {
      const stream = createPausedStream();
      render(<StreamCard stream={stream} onActionSuccess={onActionSuccess} />);

      await userEvent.click(screen.getByText('Details'));

      expect(screen.getByText('Resume')).toBeInTheDocument();
    });

    it('clicking Pause calls execute with buildPauseStream transaction', async () => {
      const stream = createActiveStream({ id: '7' });
      render(<StreamCard stream={stream} onActionSuccess={onActionSuccess} />);

      await userEvent.click(screen.getByText('Details'));
      await userEvent.click(screen.getByText('Pause'));

      expect(mockReset).toHaveBeenCalled();
      expect(mockExecute).toHaveBeenCalledTimes(1);

      // Verify the transaction passed to execute has the correct function name
      const tx = mockExecute.mock.calls[0][0];
      expect(tx.functionName).toBe('pause-stream');
      // Verify the stream ID argument
      expect(tx.functionArgs[0]).toEqual({ type: 'uint', value: 7 });
    });
  });
});
