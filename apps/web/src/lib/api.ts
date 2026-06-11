/* -----------------------------------------------------------------------
 * StreamPay — API Helpers
 * ----------------------------------------------------------------------- */

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface StreamProgress {
  percentComplete: number;
  blocksElapsed: number;
  blocksRemaining: number;
  estimatedEndDate: string;
  totalStreamed: string;
  totalClaimed: string;
  totalUnclaimed: string;
}

export interface StreamBalanceSnapshot {
  streamedBlocks: number;
  effectiveBlock: number;
  streamedAmount: string;
  cappedAmount: string;
  withdrawnAmount: string;
  claimableAmount: string;
  remainingAmount: string;
}

export interface StreamView {
  id: string;
  sender: string;
  recipient: string;
  tokenContract: string;
  startBlock: number;
  currentBlock: number;
  ratePerBlock: string;
  fundedAmount: string;
  withdrawnAmount: string;
  pausedAtBlock: number | null;
  cancelledAtBlock: number | null;
  status: "active" | "paused" | "cancelled" | "completed";
  balance: StreamBalanceSnapshot;
}

export interface StreamHistoryEvent {
  eventType: string;
  streamId: number;
  blockHeight: number;
  eventIndex: number;
  txId: string;
  sender?: string;
  recipient?: string;
  amount?: string;
  claimedAmount?: string;
  ratePerBlock?: string;
  startBlock?: number;
  endBlock?: number;
  newFee?: number;
  timestamp?: number;
}

export interface Milestone {
  label: string;
  basisPoints: number;
  amount: string;
  isReleased: boolean;
  releasedAt: number | null;
}

export interface MilestoneStream {
  id: number;
  sender: string;
  recipient: string;
  arbiter: string | null;
  totalAmount: string;
  tokenContract: string | null;
  milestones: Milestone[];
  isCancelled: boolean;
  createdAt: number;
}

export interface ProtocolStats {
  totalStreams: number;
  activeStreams: number;
  totalVolume: string;
  isProtocolPaused: boolean;
  blockHeight: number; // to be added from API
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  timestamp: number;
}

// Helper to handle response parsing
async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `API error: ${res.status}`);
  }
  const payload = await res.json();
  return payload.data;
}

// ── Stream Endpoints ───────────────────────────────────────────────────

export async function fetchStreams(params: {
  sender?: string;
  recipient?: string;
  address?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<StreamView[]>> {
  const query = new URLSearchParams();
  if (params.sender) query.append("sender", params.sender);
  if (params.recipient) query.append("recipient", params.recipient);
  if (params.address) query.append("address", params.address);
  if (params.status) query.append("status", params.status);
  if (params.page) query.append("page", params.page.toString());
  if (params.limit) query.append("limit", params.limit.toString());

  const res = await fetch(`${API_URL}/api/streams?${query.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch streams`);
  }
  return res.json();
}

export async function fetchStream(streamId: number): Promise<{
  stream: StreamView;
  claimableBalance: string;
}> {
  return fetchJson<{
    stream: StreamView;
    claimableBalance: string;
  }>(`${API_URL}/api/streams/${streamId}`);
}

export async function fetchStreamHistory(streamId: number): Promise<StreamHistoryEvent[]> {
  return fetchJson<StreamHistoryEvent[]>(`${API_URL}/api/streams/${streamId}/history`);
}

export async function fetchStreamBalance(streamId: number): Promise<{
  claimable: string;
  totalDeposited: string;
  totalClaimed: string;
  percentClaimed: number;
  progress: StreamProgress;
}> {
  return fetchJson<{
    claimable: string;
    totalDeposited: string;
    totalClaimed: string;
    percentClaimed: number;
    progress: StreamProgress;
  }>(`${API_URL}/api/streams/${streamId}/balance`);
}

// ── Milestone Endpoints ────────────────────────────────────────────────

export async function fetchMilestoneStreams(params: {
  sender?: string;
  recipient?: string;
  arbiter?: string;
  participant?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<MilestoneStream[]>> {
  const query = new URLSearchParams();
  if (params.sender) query.append("sender", params.sender);
  if (params.recipient) query.append("recipient", params.recipient);
  if (params.arbiter) query.append("arbiter", params.arbiter);
  if (params.participant) query.append("participant", params.participant);
  if (params.page) query.append("page", params.page.toString());
  if (params.limit) query.append("limit", params.limit.toString());

  const res = await fetch(`${API_URL}/api/milestones?${query.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch milestone streams`);
  }
  return res.json();
}

export async function fetchMilestoneStream(id: number): Promise<MilestoneStream> {
  return fetchJson<MilestoneStream>(`${API_URL}/api/milestones/${id}`);
}

export async function fetchReleasableMilestones(id: number): Promise<number[]> {
  return fetchJson<number[]>(`${API_URL}/api/milestones/${id}/releasable`);
}

// ── Protocol Stats ─────────────────────────────────────────────────────

export async function fetchProtocolStats(): Promise<ProtocolStats> {
  return fetchJson<ProtocolStats>(`${API_URL}/api/stats`);
}
