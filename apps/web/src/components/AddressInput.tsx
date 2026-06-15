"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { resolveName } from "../lib/bns";
import { isValidStacksAddress } from "../lib/validation";

interface AddressInputProps {
  id?: string;
  placeholder?: string;
  value: string; // Parent-managed value
  onChange: (resolvedAddress: string) => void;
  onRawValueChange?: (rawValue: string) => void; // Triggered on typing, so parent can hold the raw typed string
  disabled?: boolean;
}

export const AddressInput: React.FC<AddressInputProps> = ({
  id,
  placeholder = "SP... or name.btc",
  value,
  onChange,
  onRawValueChange,
  disabled = false,
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [resolving, setResolving] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  // Synchronize internal state with parent-controlled value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const validateAndResolve = async (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) {
      setResolvedAddress(null);
      setError(null);
      onChange("");
      return;
    }

    if (trimmed.toLowerCase().endsWith(".btc")) {
      setResolving(true);
      setError(null);
      try {
        const addr = await resolveName(trimmed);
        if (addr) {
          setResolvedAddress(addr);
          setError(null);
          onChange(addr);
        } else {
          setResolvedAddress(null);
          setError("Name not found");
          onChange("");
        }
      } catch (err) {
        setResolvedAddress(null);
        setError("Name not found");
        onChange("");
      } finally {
        setResolving(false);
      }
    } else if (isValidStacksAddress(trimmed)) {
      setResolvedAddress(trimmed);
      setError(null);
      onChange(trimmed);
    } else {
      setResolvedAddress(null);
      setError("Enter a valid Stacks address (SP... or ST...) or .btc name");
      onChange("");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (onRawValueChange) {
      onRawValueChange(val);
    } else {
      // If parent does not track raw value, pass it directly
      onChange(val);
    }

    // Immediately resolve standard Stacks addresses for fast feedback
    const trimmed = val.trim();
    if (isValidStacksAddress(trimmed)) {
      setResolvedAddress(trimmed);
      setError(null);
      onChange(trimmed);
    } else {
      setResolvedAddress(null);
    }
  };

  const handleBlur = () => {
    setTouched(true);
    validateAndResolve(inputValue);
  };

  const hasSuccess = touched && !resolving && !error && resolvedAddress !== null;
  const hasError = touched && !resolving && error;

  return (
    <div className="space-y-1.5 w-full">
      <div className="relative">
        <input
          id={id}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full bg-dark-bg border border-border rounded-lg px-4 py-3 pr-10 text-white placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-orange/50 focus:border-orange/50 transition-all font-mono text-sm disabled:opacity-50"
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
          {resolving && <Loader2 className="w-5 h-5 text-orange animate-spin" />}
          {!resolving && hasSuccess && <CheckCircle2 className="w-5 h-5 text-green-500" />}
          {!resolving && hasError && <XCircle className="w-5 h-5 text-red-500" />}
        </div>
      </div>

      {hasError && <p className="text-xs text-red-400 font-medium mt-1">{error}</p>}
      {!resolving && hasSuccess && resolvedAddress && inputValue.toLowerCase().endsWith(".btc") && (
        <p className="text-xs text-green-400 font-medium mt-1">
          Resolved address: <span className="font-mono text-white/90">{resolvedAddress}</span>
        </p>
      )}
    </div>
  );
};

export default AddressInput;
