import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { AddressInput } from '../../src/components/AddressInput';
import { resolveName } from '../../src/lib/bns';

vi.mock('../../src/lib/bns', () => ({
  resolveName: vi.fn(),
  lookupName: vi.fn(),
  isValidInput: vi.fn((input: string) => {
    return /^S[PT][A-Z0-9]{20,}$/i.test(input) || input.endsWith('.btc');
  }),
}));

describe('AddressInput', () => {
  const mockOnChange = vi.fn();
  const VALID_SP = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const StatefulAddressInput = ({ onRawValueChange }: { onRawValueChange?: (val: string) => void }) => {
    const [value, setValue] = React.useState('');
    const handleChange = (val: string) => {
      setValue(val);
      mockOnChange(val);
    };
    return (
      <AddressInput
        value={value}
        onChange={handleChange}
        onRawValueChange={onRawValueChange}
      />
    );
  };

  it('fires onChange immediately with valid SP address when typing (no API resolution)', async () => {
    render(<StatefulAddressInput />);

    const input = screen.getByPlaceholderText('SP... or name.btc');
    await userEvent.type(input, VALID_SP);

    // onChange is triggered immediately for valid Stacks addresses
    expect(mockOnChange).toHaveBeenLastCalledWith(VALID_SP);
    expect(resolveName).not.toHaveBeenCalled();
  });

  it('shows loading spinner while resolving a .btc name', async () => {
    // Make resolveName hang/take time
    let resolvePromise: (value: string | null) => void = () => {};
    const delayPromise = new Promise<string | null>((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(resolveName).mockReturnValue(delayPromise);

    render(<StatefulAddressInput />);
    const input = screen.getByPlaceholderText('SP... or name.btc');
    
    await userEvent.type(input, 'alice.btc');
    fireEvent.blur(input);

    // Loading spinner should be visible (represented by an animate-spin icon)
    expect(screen.getByRole('textbox').nextSibling).toBeInTheDocument();
    
    // Resolve the promise
    resolvePromise(VALID_SP);
  });

  it('shows resolved address text after successful BNS resolution', async () => {
    vi.mocked(resolveName).mockResolvedValue(VALID_SP);

    render(<StatefulAddressInput />);
    const input = screen.getByPlaceholderText('SP... or name.btc');

    await userEvent.type(input, 'alice.btc');
    fireEvent.blur(input);

    await waitFor(() => {
      expect(screen.getByText(/Resolved address:/)).toBeInTheDocument();
      expect(screen.getByText(VALID_SP)).toBeInTheDocument();
    });

    // onChange should have been called with the resolved SP address, NOT the btc name
    expect(mockOnChange).toHaveBeenCalledWith(VALID_SP);
  });

  it('shows "Name not found" error when .btc name cannot be resolved', async () => {
    vi.mocked(resolveName).mockResolvedValue(null);

    render(<StatefulAddressInput />);
    const input = screen.getByPlaceholderText('SP... or name.btc');

    await userEvent.type(input, 'nonexistent.btc');
    fireEvent.blur(input);

    await waitFor(() => {
      expect(screen.getByText('Name not found')).toBeInTheDocument();
    });

    // Should clear the parent value
    expect(mockOnChange).toHaveBeenCalledWith('');
  });
});
