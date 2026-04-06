// TODO: Export all shared types
//
// Core Types:
// - Stream: Payment stream data structure
// - StreamConfig: Configuration for creating streams
// - StreamStatus: Active | Paused | Cancelled | Completed
// - PaymentClaim: Claim transaction data
//
// API Types:
// - ApiResponse<T>: Generic API response wrapper
// - PaginatedResponse<T>: Paginated list response
// - ErrorResponse: API error format
//
// Contract Types:
// - ContractCallOptions: Options for contract calls
// - TransactionResult: Result of a blockchain transaction

export {};

// TODO: Implement types
// export interface Stream {
//   id: string;
//   sender: string;
//   recipient: string;
//   amount: bigint;
//   interval: number;
//   startTime: number;
//   endTime: number | null;
//   status: StreamStatus;
//   claimedAmount: bigint;
// }

// export type StreamStatus = 'active' | 'paused' | 'cancelled' | 'completed';
