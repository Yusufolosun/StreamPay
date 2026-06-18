import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { AddressDisplay } from '../../src/components/AddressDisplay';
import { lookupName } from '../../src/lib/bns';

vi.mock('../../src/lib/bns', () => ({
  lookupName: vi.fn(),
  resolveName: vi.fn(),
}));

describe('AddressDisplay', () => {
  const VALID_SP = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows truncated address when BNS lookup returns null', async () => {
    vi.mocked(lookupName).mockResolvedValue(null);

    render(<AddressDisplay address={VALID_SP} />);

    // Should display truncated address like SP2J6Z...9EJ7
    await waitFor(() => {
      expect(screen.getByText('SP2J6Z...9EJ7')).toBeInTheDocument();
    });
  });

  it('shows BNS name when lookup succeeds', async () => {
    vi.mocked(lookupName).mockResolvedValue('alice.btc');

    render(<AddressDisplay address={VALID_SP} />);

    await waitFor(() => {
      expect(screen.getByText('alice.btc')).toBeInTheDocument();
    });
  });

  it('copies full SP address to clipboard when clicked', async () => {
    vi.mocked(lookupName).mockResolvedValue(null);

    render(<AddressDisplay address={VALID_SP} />);

    const addressEl = await screen.findByText('SP2J6Z...9EJ7');
    await userEvent.click(addressEl);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(VALID_SP);
  });
});
