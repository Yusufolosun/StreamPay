import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock resolveName to control BNS resolutions
vi.mock('../../src/lib/bns', () => ({
  resolveName: vi.fn(async (name: string) => {
    if (name === 'alice.btc') {
      return 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
    }
    return null;
  }),
  lookupName: vi.fn(async () => null),
  isValidInput: vi.fn((input: string) => {
    return /^S[PT][A-Z0-9]{20,}$/i.test(input) || input.endsWith('.btc');
  }),
}));

vi.mock('../../src/components/Toast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

// Mock components that we do not want to test in isolation here
vi.mock('./ReviewConfirm', () => ({
  ReviewConfirm: () => <div data-testid="review-confirm">Review and Confirm Step</div>,
}));

vi.mock('./MilestoneInvoiceForm', () => ({
  MilestoneInvoiceForm: () => <div data-testid="milestone-form">Milestone Invoice Form</div>,
}));

import SendPage from '../../src/app/send/page';
import { ContinuousStreamForm } from '../../src/app/send/ContinuousStreamForm';
import { VALID_SP_ADDRESS } from '../fixtures';

describe('ContinuousStreamForm & SendPage Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Step 1: Stream Type Selection', () => {
    it('renders three cards: Continuous, Milestone, Vesting', () => {
      render(<SendPage />);

      expect(screen.getByText('Continuous Stream')).toBeInTheDocument();
      expect(screen.getByText('Milestone Invoice')).toBeInTheDocument();
      expect(screen.getByText('Vesting Schedule')).toBeInTheDocument();
    });

    it('advances to step 2 Continuous Stream form upon clicking Continuous Stream card', async () => {
      render(<SendPage />);

      const continuousCard = screen.getByText('Continuous Stream').closest('button');
      expect(continuousCard).toBeInTheDocument();

      await userEvent.click(continuousCard!);

      // Now we should see the Continuous Stream form controls
      expect(screen.getByLabelText('Recipient Address')).toBeInTheDocument();
      expect(screen.getByLabelText(/Amount/)).toBeInTheDocument();
    });
  });

  describe('Step 2: Continuous Stream Form Validations', () => {
    it('shows inline error on blur for invalid recipient address', async () => {
      render(<ContinuousStreamForm onSubmit={vi.fn()} />);

      const recipientInput = screen.getByLabelText('Recipient Address');
      await userEvent.type(recipientInput, 'invalid-address');
      fireEvent.blur(recipientInput);

      await waitFor(() => {
        expect(screen.getByText('Enter a valid Stacks address (SP... or ST...) or .btc name')).toBeInTheDocument();
      });
    });

    it('shows amount validation error when below minimum amount', async () => {
      render(<ContinuousStreamForm onSubmit={vi.fn()} />);

      const amountInput = screen.getByLabelText(/Amount/);
      await userEvent.type(amountInput, '0.0005');
      fireEvent.blur(amountInput);

      await waitFor(() => {
        expect(screen.getByText('Minimum amount is 0.001 STX')).toBeInTheDocument();
      });
    });

    it('updates estimated end date text when selecting a duration preset', async () => {
      render(<ContinuousStreamForm onSubmit={vi.fn()} />);

      // Default is 30d. Let's click "7d" preset.
      const preset7d = screen.getByRole('button', { name: '7d' });
      await userEvent.click(preset7d);

      // Estimated end date text should contain "1,008 blocks" (7 days * 144 blocks/day)
      expect(screen.getByText(/1,008 blocks/)).toBeInTheDocument();
    });

    it('updates rate per block, protocol fee, and total cost on amount/duration changes', async () => {
      render(<ContinuousStreamForm onSubmit={vi.fn()} />);

      const amountInput = screen.getByLabelText(/Amount/);
      await userEvent.type(amountInput, '1000'); // 1000 STX
      
      // Default duration is 30d = 30 * 144 = 4320 blocks
      // Rate per block: 1000 / 4320 = 0.231481 STX/block
      // Protocol fee (0.25%): 1000 * 0.0025 = 2.500000 STX
      // Total pay: 1002.500000 STX
      expect(screen.getByText('0.231481 STX')).toBeInTheDocument();
      expect(screen.getByText('2.500000 STX')).toBeInTheDocument();
      expect(screen.getByText('1002.500000 STX')).toBeInTheDocument();
    });

    it('disables submit button until all inputs are valid', async () => {
      const handleSubmit = vi.fn();
      render(<ContinuousStreamForm onSubmit={handleSubmit} />);

      const submitBtn = screen.getByRole('button', { name: 'Review Stream' });
      expect(submitBtn).toBeDisabled();

      // Enter valid recipient and amount
      const recipientInput = screen.getByLabelText('Recipient Address');
      await userEvent.type(recipientInput, VALID_SP_ADDRESS);
      fireEvent.blur(recipientInput);

      const amountInput = screen.getByLabelText(/Amount/);
      await userEvent.type(amountInput, '10');
      fireEvent.blur(amountInput);

      await waitFor(() => {
        expect(submitBtn).not.toBeDisabled();
      });
    });

    it('triggers onSubmit with correct ContinuousFormData when submit clicked', async () => {
      const handleSubmit = vi.fn();
      render(<ContinuousStreamForm onSubmit={handleSubmit} />);

      const recipientInput = screen.getByLabelText('Recipient Address');
      await userEvent.type(recipientInput, VALID_SP_ADDRESS);
      fireEvent.blur(recipientInput);

      const amountInput = screen.getByLabelText(/Amount/);
      await userEvent.type(amountInput, '10');
      fireEvent.blur(amountInput);

      await waitFor(() => {
        const submitBtn = screen.getByRole('button', { name: 'Review Stream' });
        expect(submitBtn).not.toBeDisabled();
      });

      const submitBtn = screen.getByRole('button', { name: 'Review Stream' });
      await userEvent.click(submitBtn);

      expect(handleSubmit).toHaveBeenCalledTimes(1);
      const data = handleSubmit.mock.calls[0][0];
      expect(data.recipient).toBe(VALID_SP_ADDRESS);
      expect(data.amount).toBe('10');
      expect(data.ratePerBlock).toBe(BigInt(Math.floor(10 * 1_000_000 / 4320))); // 10 STX over 30d (4320 blocks)
      expect(data.protocolFee).toBe(25000n); // 0.25% of 10 STX (10_000_000 microSTX)
      expect(data.totalCost).toBe(10025000n);
    });
  });
});
