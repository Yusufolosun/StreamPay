/**
 * Global test setup for @streampay/web.
 *
 * Mocks: @stacks/connect (no real wallet), fetch (mock API),
 * WebSocket (mock), localStorage (clean per test), navigator.clipboard.
 */

import { vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';

// ── Mock @stacks/connect ───────────────────────────────────────────────
// Prevents any real wallet interaction during tests.

vi.mock('@stacks/connect', () => ({
  openContractCall: vi.fn(({ onFinish }) => {
    // Simulate a successful transaction by default
    if (onFinish) {
      onFinish({ txId: 'mock-tx-id-0x1234' });
    }
  }),
  authenticate: vi.fn(({ onFinish }) => {
    if (onFinish) {
      onFinish();
    }
  }),
  AppConfig: vi.fn().mockImplementation(() => ({})),
  UserSession: vi.fn().mockImplementation(() => ({
    isUserSignedIn: () => false,
    loadUserData: () => ({
      profile: {
        stxAddress: {
          mainnet: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
          testnet: 'ST2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKQYAC0RQ',
        },
      },
    }),
    signUserOut: vi.fn(),
  })),
}));

// ── Mock @stacks/network ───────────────────────────────────────────────

vi.mock('@stacks/network', () => ({
  createNetwork: vi.fn().mockReturnValue({
    coreApiUrl: 'http://localhost:3999',
  }),
}));

// ── Mock @stacks/transactions ──────────────────────────────────────────
// Provide lightweight stubs for Clarity value constructors.

vi.mock('@stacks/transactions', () => ({
  uintCV: vi.fn((val: number | bigint) => ({ type: 'uint', value: val })),
  principalCV: vi.fn((val: string) => ({ type: 'principal', value: val })),
  contractPrincipalCV: vi.fn((addr: string, name: string) => ({
    type: 'contractPrincipal',
    value: `${addr}.${name}`,
  })),
  stringAsciiCV: vi.fn((val: string) => ({ type: 'stringAscii', value: val })),
  boolCV: vi.fn((val: boolean) => ({ type: 'bool', value: val })),
  noneCV: vi.fn(() => ({ type: 'none' })),
  someCV: vi.fn((val: any) => ({ type: 'some', value: val })),
  tupleCV: vi.fn((val: any) => ({ type: 'tuple', value: val })),
  listCV: vi.fn((val: any) => ({ type: 'list', value: val })),
  optionalCVOf: vi.fn((val: any) => ({ type: 'optional', value: val })),
}));

// ── Mock next/link ─────────────────────────────────────────────────────

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => {
    return children;
  },
}));

// ── Mock next/navigation ───────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// ── Mock fetch ─────────────────────────────────────────────────────────

const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ success: true, data: [] }),
  status: 200,
});

vi.stubGlobal('fetch', mockFetch);

// ── Mock WebSocket ─────────────────────────────────────────────────────

class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSING = 2;
  readonly CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  url: string;
  onopen: ((event: any) => void) | null = null;
  onclose: ((event: any) => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    // Simulate connection on next tick
    setTimeout(() => {
      if (this.onopen) {
        this.onopen({ type: 'open' });
      }
    }, 0);
  }

  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
  });
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
}

vi.stubGlobal('WebSocket', MockWebSocket);

// ── Mock navigator.clipboard ───────────────────────────────────────────

Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
  writable: true,
  configurable: true,
});

// ── Mock window.matchMedia ─────────────────────────────────────────────

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ── Clean up between tests ─────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, data: [] }),
    status: 200,
  });
});

afterEach(() => {
  cleanup();
});

export { mockFetch };
