import { initSimnet, type ParsedTransactionResult, type Simnet } from "@hirosystems/clarinet-sdk";
import { Cl, ClarityType, type ClarityValue } from "@stacks/transactions";
import { beforeEach, describe, expect, it } from "vitest";

const CONTRACT = "stream-core";
const DEFAULT_DEPLOYER_MNEMONIC =
	"abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

const ERR_NOT_AUTHORISED = 1000n;
const ERR_INVALID_AMOUNT = 1003n;
const ERR_INVALID_RATE = 1004n;
const ERR_INVALID_RECIPIENT = 1005n;
const ERR_INSUFFICIENT_BALANCE = 1008n;
const ERR_PROTOCOL_PAUSED = 1014n;
const ERR_STREAM_CANCELLED = 1015n;

const PROTOCOL_FEE_BPS = 25n;
const BPS_DENOMINATOR = 10_000n;

type Accounts = {
	deployer: string;
	sender: string;
	recipient: string;
};

describe("stream-core", () => {
	let simnet: Simnet;
	let accounts: Accounts;
	let trackedStreamIds: Set<bigint>;

	beforeEach(async () => {
		process.env.DEPLOYER_MNEMONIC ??= DEFAULT_DEPLOYER_MNEMONIC;
		simnet = await initSimnet("./Clarinet.toml", true);
		const loadedAccounts = simnet.getAccounts();
		accounts = {
			deployer: requireAccount(loadedAccounts, "deployer"),
			sender: requireAccount(loadedAccounts, "wallet_1"),
			recipient: requireAccount(loadedAccounts, "wallet_2"),
		};
		trackedStreamIds = new Set<bigint>();
		assertFundConservationInvariant();
	});

	const callPublic = (method: string, args: ClarityValue[], caller: string): ParsedTransactionResult => {
		const receipt = simnet.callPublicFn(CONTRACT, method, args, caller);
		if (
			method === "create-stream" &&
			receipt.result.type === ClarityType.ResponseOk &&
			receipt.result.value.type === ClarityType.UInt
		) {
			trackedStreamIds.add(receipt.result.value.value);
		}
		assertFundConservationInvariant();
		return receipt;
	};

	const callReadOnly = (method: string, args: ClarityValue[], caller = accounts.sender): ClarityValue => {
		return simnet.callReadOnlyFn(CONTRACT, method, args, caller).result;
	};

	const mineBlocks = (count: number): void => {
		simnet.mineEmptyBlocks(count);
		assertFundConservationInvariant();
	};

	const createStream = (
		amount: bigint,
		ratePerBlock: bigint,
		durationBlocks: bigint,
		recipient = accounts.recipient,
		caller = accounts.sender,
	): ParsedTransactionResult => {
		return callPublic(
			"create-stream",
			[
				Cl.standardPrincipal(recipient),
				Cl.uint(amount),
				Cl.uint(ratePerBlock),
				Cl.uint(durationBlocks),
				Cl.none(),
			],
			caller,
		);
	};

	const claimStream = (streamId: bigint, caller = accounts.recipient): ParsedTransactionResult => {
		return callPublic("claim-stream", [Cl.uint(streamId)], caller);
	};

	const pauseStream = (streamId: bigint, caller = accounts.sender): ParsedTransactionResult => {
		return callPublic("pause-stream", [Cl.uint(streamId)], caller);
	};

	const resumeStream = (streamId: bigint, caller = accounts.sender): ParsedTransactionResult => {
		return callPublic("resume-stream", [Cl.uint(streamId)], caller);
	};

	const cancelStream = (streamId: bigint, caller = accounts.sender): ParsedTransactionResult => {
		return callPublic("cancel-stream", [Cl.uint(streamId)], caller);
	};

	const emergencyPauseProtocol = (caller = accounts.deployer): ParsedTransactionResult => {
		return callPublic("emergency-pause-protocol", [], caller);
	};

	const withdrawFees = (
		amount: bigint,
		recipient: string,
		caller = accounts.deployer,
	): ParsedTransactionResult => {
		return callPublic("withdraw-accumulated-fees", [Cl.uint(amount), Cl.standardPrincipal(recipient)], caller);
	};

	const getContractPrincipal = (): string => `${accounts.deployer}.${CONTRACT}`;

	const getStxBalance = (principal: string): bigint => {
		const stxBalances = simnet.getAssetsMap().get("STX");
		return stxBalances?.get(principal) ?? 0n;
	};

	const parseTuple = (cv: ClarityValue): Record<string, ClarityValue> => {
		if (cv.type !== ClarityType.Tuple) {
			throw new Error("expected tuple clarity value");
		}
		return cv.data;
	};

	const parseSome = (cv: ClarityValue): ClarityValue => {
		if (cv.type !== ClarityType.OptionalSome) {
			throw new Error("expected optional some clarity value");
		}
		return cv.value;
	};

	const parseUInt = (cv: ClarityValue): bigint => {
		if (cv.type !== ClarityType.UInt) {
			throw new Error("expected uint clarity value");
		}
		return cv.value;
	};

	const parseAscii = (cv: ClarityValue): string => {
		if (cv.type !== ClarityType.StringASCII) {
			throw new Error("expected string-ascii clarity value");
		}
		return cv.data;
	};

	const parseBool = (cv: ClarityValue): boolean => {
		if (cv.type === ClarityType.BoolTrue) return true;
		if (cv.type === ClarityType.BoolFalse) return false;
		throw new Error("expected bool clarity value");
	};

	const parseList = (cv: ClarityValue): ClarityValue[] => {
		if (cv.type !== ClarityType.List) {
			throw new Error("expected list clarity value");
		}
		return cv.list;
	};

	const getStreamTuple = (streamId: bigint): Record<string, ClarityValue> | null => {
		const result = callReadOnly("get-stream", [Cl.uint(streamId)]);
		if (result.type === ClarityType.OptionalNone) {
			return null;
		}
		return parseTuple(parseSome(result));
	};

	const getClaimable = (streamId: bigint): bigint => {
		const result = callReadOnly("get-claimable-balance", [Cl.uint(streamId)]);
		return parseUInt(result);
	};

	const getUnclaimedActiveStxDeposits = (): bigint => {
		let total = 0n;
		for (const streamId of trackedStreamIds) {
			const stream = getStreamTuple(streamId);
			if (stream === null) continue;
			if (stream["token-contract"].type !== ClarityType.OptionalNone) continue;
			if (parseBool(stream["is-cancelled"])) continue;
			const depositAmount = parseUInt(stream["deposit-amount"]);
			const claimedAmount = parseUInt(stream["claimed-amount"]);
			total += depositAmount - claimedAmount;
		}
		return total;
	};

	const assertFundConservationInvariant = (): void => {
		const unclaimedDeposits = getUnclaimedActiveStxDeposits();
		const contractBalance = getStxBalance(getContractPrincipal());
		const activeDepositsCv = callReadOnly("get-total-active-stx-deposits", []);
		const withdrawableFeesCv = callReadOnly("get-withdrawable-fees", []);
		const activeDeposits = parseUInt(activeDepositsCv);
		const withdrawableFees = parseUInt(withdrawableFeesCv);

		expect(activeDeposits).toBe(unclaimedDeposits);
		expect(contractBalance).toBe(unclaimedDeposits + withdrawableFees);
	};

	const requirePrintEvent = (
		receipt: ParsedTransactionResult,
		eventType: string,
	): Record<string, ClarityValue> => {
		for (const event of receipt.events) {
			if (event.event !== "print_event" || event.data.value === undefined) continue;
			if (event.data.value.type !== ClarityType.Tuple) continue;
			const tuple = parseTuple(event.data.value);
			const emittedType = tuple["event-type"];
			if (emittedType !== undefined && emittedType.type === ClarityType.StringASCII) {
				if (parseAscii(emittedType) === eventType) {
					return tuple;
				}
			}
		}
		throw new Error(`missing print event ${eventType}`);
	};

	const feeFor = (amount: bigint): bigint => (amount * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;

	it("fund conservation invariant holds after each state transition", () => {
		const createReceipt = createStream(1_000_000n, 1_000n, 20n);
		expect(createReceipt.result).toStrictEqual(Cl.ok(Cl.uint(0)));

		mineBlocks(5);

		const claimableBeforeClaim = getClaimable(0n);
		expect(claimableBeforeClaim > 0n).toBe(true);

		const claimReceipt = claimStream(0n);
		expect(claimReceipt.result).toStrictEqual(Cl.ok(Cl.uint(claimableBeforeClaim)));

		const pauseReceipt = pauseStream(0n);
		expect(pauseReceipt.result).toStrictEqual(Cl.ok(Cl.bool(true)));

		const resumeReceipt = resumeStream(0n);
		expect(resumeReceipt.result).toStrictEqual(Cl.ok(Cl.bool(true)));

		const cancelReceipt = cancelStream(0n);
		expect(cancelReceipt.result.type).toBe(ClarityType.ResponseOk);
	});

	it("create-stream happy path returns u0, emits event, and deducts fee", () => {
		const amount = 1_000_000n;
		const ratePerBlock = 1_000n;
		const durationBlocks = 20n;
		const senderBalanceBefore = getStxBalance(accounts.sender);

		const receipt = createStream(amount, ratePerBlock, durationBlocks);
		expect(receipt.result).toStrictEqual(Cl.ok(Cl.uint(0)));

		const emitted = requirePrintEvent(receipt, "stream-created");
		expect(parseUInt(parseSome(emitted["stream-id"]))).toBe(0n);

		const expectedFee = feeFor(amount);
		const expectedDeposit = amount - expectedFee;
		expect(parseUInt(emitted["fee-amount"])).toBe(expectedFee);
		expect(parseUInt(emitted["deposit-amount"])).toBe(expectedDeposit);

		const stream = getStreamTuple(0n);
		expect(stream).not.toBeNull();
		expect(parseUInt(stream!["deposit-amount"])).toBe(expectedDeposit);
		expect(getStxBalance(accounts.sender)).toBe(senderBalanceBefore - amount);
	});

	it("create-stream fails when recipient equals tx-sender", () => {
		const receipt = createStream(1_000_000n, 1_000n, 10n, accounts.sender, accounts.sender);
		expect(receipt.result).toStrictEqual(Cl.error(Cl.uint(ERR_INVALID_RECIPIENT)));
	});

	it("create-stream fails when amount is below or equal to minimum", () => {
		const receipt = createStream(1_000n, 1n, 10n);
		expect(receipt.result).toStrictEqual(Cl.error(Cl.uint(ERR_INVALID_AMOUNT)));
	});

	it("create-stream fails when rate-per-block is zero", () => {
		const receipt = createStream(1_000_000n, 0n, 10n);
		expect(receipt.result).toStrictEqual(Cl.error(Cl.uint(ERR_INVALID_RATE)));
	});

	it("create-stream fails when protocol is paused", () => {
		const pauseReceipt = emergencyPauseProtocol();
		expect(pauseReceipt.result).toStrictEqual(Cl.ok(Cl.bool(true)));

		const createReceipt = createStream(1_000_000n, 1_000n, 10n);
		expect(createReceipt.result).toStrictEqual(Cl.error(Cl.uint(ERR_PROTOCOL_PAUSED)));
	});

	it("create-stream updates sender-streams index", () => {
		const createReceipt = createStream(2_000_000n, 2_000n, 10n);
		expect(createReceipt.result).toStrictEqual(Cl.ok(Cl.uint(0)));

		const senderStreams = callReadOnly("get-sender-streams", [Cl.standardPrincipal(accounts.sender)]);
		const ids = parseList(senderStreams).map((id) => parseUInt(id));
		expect(ids).toStrictEqual([0n]);
	});

	it("create-stream nonce increments across multiple creates", () => {
		const firstCreate = createStream(2_000_000n, 1_000n, 10n);
		const secondCreate = createStream(2_500_000n, 1_000n, 10n);

		expect(firstCreate.result).toStrictEqual(Cl.ok(Cl.uint(0)));
		expect(secondCreate.result).toStrictEqual(Cl.ok(Cl.uint(1)));

		const senderStreams = callReadOnly("get-sender-streams", [Cl.standardPrincipal(accounts.sender)]);
		const ids = parseList(senderStreams).map((id) => parseUInt(id));
		expect(ids).toStrictEqual([0n, 1n]);
	});

	it("claim-stream transfers N * rate after mining N blocks", () => {
		const ratePerBlock = 2_000n;
		const blocksToMine = 7;
		const expectedClaim = ratePerBlock * BigInt(blocksToMine);

		const createReceipt = createStream(1_000_000n, ratePerBlock, 100n);
		expect(createReceipt.result).toStrictEqual(Cl.ok(Cl.uint(0)));

		mineBlocks(blocksToMine);

		const recipientBalanceBefore = getStxBalance(accounts.recipient);
		const claimReceipt = claimStream(0n);
		expect(claimReceipt.result).toStrictEqual(Cl.ok(Cl.uint(expectedClaim)));
		expect(getStxBalance(accounts.recipient)).toBe(recipientBalanceBefore + expectedClaim);
	});

	it("claim-stream fails for non-recipient caller", () => {
		const createReceipt = createStream(1_000_000n, 1_000n, 20n);
		expect(createReceipt.result).toStrictEqual(Cl.ok(Cl.uint(0)));

		mineBlocks(3);

		const claimReceipt = claimStream(0n, accounts.sender);
		expect(claimReceipt.result).toStrictEqual(Cl.error(Cl.uint(ERR_NOT_AUTHORISED)));
	});

	it("claim-stream fails when claimable amount is zero immediately after create", () => {
		const createReceipt = createStream(1_000_000n, 1_000n, 20n);
		expect(createReceipt.result).toStrictEqual(Cl.ok(Cl.uint(0)));

		const claimReceipt = claimStream(0n);
		expect(claimReceipt.result).toStrictEqual(Cl.error(Cl.uint(ERR_INSUFFICIENT_BALANCE)));
	});

	it("claim-stream multiple partial claims accumulate", () => {
		const createReceipt = createStream(2_000_000n, 1_000n, 100n);
		expect(createReceipt.result).toStrictEqual(Cl.ok(Cl.uint(0)));

		mineBlocks(3);
		const firstClaim = claimStream(0n);
		expect(firstClaim.result).toStrictEqual(Cl.ok(Cl.uint(3_000n)));

		mineBlocks(4);
		const secondClaim = claimStream(0n);
		expect(secondClaim.result).toStrictEqual(Cl.ok(Cl.uint(4_000n)));

		const stream = getStreamTuple(0n);
		expect(stream).not.toBeNull();
		expect(parseUInt(stream!["claimed-amount"])).toBe(7_000n);
	});

	it("claim-stream after expiry claims only remaining balance", () => {
		const ratePerBlock = 100_000n;
		const durationBlocks = 20n;
		const createReceipt = createStream(1_200_000n, ratePerBlock, durationBlocks);
		expect(createReceipt.result).toStrictEqual(Cl.ok(Cl.uint(0)));

		const initialStream = getStreamTuple(0n);
		expect(initialStream).not.toBeNull();
		const depositAmount = parseUInt(initialStream!["deposit-amount"]);

		mineBlocks(5);
		const firstClaim = claimStream(0n);
		expect(firstClaim.result).toStrictEqual(Cl.ok(Cl.uint(500_000n)));

		mineBlocks(30);
		const remaining = depositAmount - 500_000n;
		const secondClaim = claimStream(0n);
		expect(secondClaim.result).toStrictEqual(Cl.ok(Cl.uint(remaining)));

		const thirdClaim = claimStream(0n);
		expect(thirdClaim.result).toStrictEqual(Cl.error(Cl.uint(ERR_INSUFFICIENT_BALANCE)));
	});

	it("pause-stream stops accrual while paused", () => {
		const createReceipt = createStream(2_000_000n, 1_000n, 100n);
		expect(createReceipt.result).toStrictEqual(Cl.ok(Cl.uint(0)));

		mineBlocks(5);
		const claimableBeforePause = getClaimable(0n);

		const pauseReceipt = pauseStream(0n);
		expect(pauseReceipt.result).toStrictEqual(Cl.ok(Cl.bool(true)));

		mineBlocks(10);
		const claimableAfterPausedBlocks = getClaimable(0n);
		expect(claimableAfterPausedBlocks).toBe(claimableBeforePause);
	});

	it("resume-stream restarts accrual after pause", () => {
		const createReceipt = createStream(2_000_000n, 1_000n, 100n);
		expect(createReceipt.result).toStrictEqual(Cl.ok(Cl.uint(0)));

		mineBlocks(5);
		expect(pauseStream(0n).result).toStrictEqual(Cl.ok(Cl.bool(true)));

		mineBlocks(8);
		const pausedClaimable = getClaimable(0n);

		const resumeReceipt = resumeStream(0n);
		expect(resumeReceipt.result).toStrictEqual(Cl.ok(Cl.bool(true)));

		mineBlocks(4);
		const resumedClaimable = getClaimable(0n);
		expect(resumedClaimable).toBe(pausedClaimable + 4_000n);
	});
});

function requireAccount(accounts: Map<string, string>, key: string): string {
	const account = accounts.get(key);
	if (!account) {
		throw new Error(`missing expected account: ${key}`);
	}
	return account;
}
