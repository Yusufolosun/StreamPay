import { initSimnet, type ParsedTransactionResult, type Simnet } from "@hirosystems/clarinet-sdk";
import { Cl, ClarityType, type ClarityValue } from "@stacks/transactions";
import { beforeEach, describe, expect, it } from "vitest";

const CONTRACT = "stream-conditions";
const DEFAULT_DEPLOYER_MNEMONIC =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

const ERR_NOT_AUTHORIZED = 2000n;
const ERR_INVALID_MILESTONES = 2003n;
const ERR_MILESTONE_RELEASED = 2005n;
const ERR_DISPUTE_NOT_ACTIVE = 2007n;
const ERR_DISPUTE_ACTIVE = 2008n;
const ERR_TOKEN_NOT_WHITELISTED = 2010n;

type Accounts = {
  deployer: string;
  sender: string;
  recipient: string;
};

describe("stream-conditions", () => {
  let simnet: Simnet;
  let accounts: Accounts;

  beforeEach(async () => {
    process.env.DEPLOYER_MNEMONIC = DEFAULT_DEPLOYER_MNEMONIC;
    simnet = await initSimnet("./Clarinet.toml", true);
    const loadedAccounts = simnet.getAccounts();
    accounts = {
      deployer: requireAccount(loadedAccounts, "deployer"),
      sender: requireAccount(loadedAccounts, "wallet_1"),
      recipient: requireAccount(loadedAccounts, "wallet_2"),
    };
  }, 30_000);

  const callPublic = (method: string, args: ClarityValue[], caller: string): ParsedTransactionResult => {
    return simnet.callPublicFn(CONTRACT, method, args, caller);
  };

  const callReadOnly = (method: string, args: ClarityValue[], caller = accounts.sender): ClarityValue => {
    return simnet.callReadOnlyFn(CONTRACT, method, args, caller).result;
  };

  const parseTuple = (cv: ClarityValue): Record<string, ClarityValue> => {
    if (cv.type !== ClarityType.Tuple) {
      throw new Error("expected tuple clarity value");
    }
    return cv.value;
  };

  const parseSome = (cv: ClarityValue): ClarityValue => {
    if (cv.type !== ClarityType.OptionalSome) {
      throw new Error("expected optional some clarity value");
    }
    return cv.value;
  };

  const parseOk = (cv: ClarityValue): ClarityValue => {
    if (cv.type !== ClarityType.ResponseOk) {
      throw new Error("expected response ok clarity value");
    }
    return cv.value;
  };

  const parseUInt = (cv: ClarityValue): bigint => {
    if (cv.type !== ClarityType.UInt) {
      throw new Error("expected uint clarity value");
    }
    return cv.value;
  };

  const parseBool = (cv: ClarityValue): boolean => {
    if (cv.type === ClarityType.BoolTrue) return true;
    if (cv.type === ClarityType.BoolFalse) return false;
    throw new Error("expected bool clarity value");
  };

  const makeMilestone = (label: string, basisPoints: bigint): ClarityValue =>
    Cl.tuple({
      label: Cl.stringAscii(label),
      "basis-points": Cl.uint(basisPoints),
      "is-released": Cl.bool(false),
      "released-at": Cl.none(),
    });

  const createMilestoneStream = (
    totalAmount: bigint,
    milestones: ClarityValue[],
    arbiter: string | null,
    tokenContract: ClarityValue = Cl.none(),
    caller = accounts.sender,
  ): ParsedTransactionResult => {
    return callPublic(
      "create-milestone-stream",
      [
        Cl.standardPrincipal(accounts.recipient),
        Cl.uint(totalAmount),
        tokenContract,
        Cl.list(milestones),
        arbiter ? Cl.some(Cl.standardPrincipal(arbiter)) : Cl.none(),
      ],
      caller,
    );
  };

  const registerArbiter = (stakeAmount: bigint, caller = accounts.deployer): ParsedTransactionResult => {
    return callPublic("register-arbiter", [Cl.uint(stakeAmount)], caller);
  };

  it("create-milestone-stream stores canonical stream data", () => {
    const milestones = [makeMilestone("build", 6000n), makeMilestone("ship", 4000n)];
    const createReceipt = createMilestoneStream(1_000_000n, milestones, null);

    expect(createReceipt.result).toStrictEqual(Cl.ok(Cl.uint(1)));

    const streamCv = callReadOnly("get-milestone-stream", [Cl.uint(1)]);
    const stream = parseTuple(parseSome(streamCv));
    expect(parseUInt(stream["total-amount"])).toBe(1_000_000n);
    expect(parseBool(stream["is-cancelled"])).toBe(false);

    const nonceCv = callReadOnly("get-milestone-stream-id-nonce", []);
    expect(parseUInt(nonceCv)).toBe(1n);
  });

  it("create-milestone-stream rejects basis-point totals not equal to 10000", () => {
    const invalidMilestones = [makeMilestone("m1", 5000n), makeMilestone("m2", 4000n)];
    const createReceipt = createMilestoneStream(1_000_000n, invalidMilestones, null);

    expect(createReceipt.result).toStrictEqual(Cl.error(Cl.uint(ERR_INVALID_MILESTONES)));
  });

  it("create-milestone-stream rejects tokenized flow until SIP-010 routing is enabled", () => {
    const milestones = [makeMilestone("m1", 5000n), makeMilestone("m2", 5000n)];
    const fakeToken = Cl.some(Cl.contractPrincipal(accounts.deployer, "fake-token"));
    const createReceipt = createMilestoneStream(1_000_000n, milestones, null, fakeToken);

    expect(createReceipt.result).toStrictEqual(Cl.error(Cl.uint(ERR_TOKEN_NOT_WHITELISTED)));
  });

  it("sender can release a milestone once and double-release is blocked", () => {
    const milestones = [makeMilestone("phase-a", 5000n), makeMilestone("phase-b", 5000n)];
    expect(createMilestoneStream(1_000_000n, milestones, null).result).toStrictEqual(Cl.ok(Cl.uint(1)));

    const recipientBalanceBefore = getStxBalance(simnet, accounts.recipient);
    const releaseReceipt = callPublic("release-milestone", [Cl.uint(1), Cl.uint(0)], accounts.sender);
    expect(releaseReceipt.result).toStrictEqual(Cl.ok(Cl.uint(500_000)));
    expect(getStxBalance(simnet, accounts.recipient)).toBe(recipientBalanceBefore + 500_000n);

    const secondRelease = callPublic("release-milestone", [Cl.uint(1), Cl.uint(0)], accounts.sender);
    expect(secondRelease.result).toStrictEqual(Cl.error(Cl.uint(ERR_MILESTONE_RELEASED)));
  });

  it("dispute flow allows only arbiter resolution and increments arbiter counters", () => {
    expect(registerArbiter(10_000n).result).toStrictEqual(Cl.ok(Cl.bool(true)));

    const milestones = [makeMilestone("phase-a", 5000n), makeMilestone("phase-b", 5000n)];
    expect(createMilestoneStream(1_000_000n, milestones, accounts.deployer).result).toStrictEqual(Cl.ok(Cl.uint(1)));

    expect(callPublic("dispute-milestone", [Cl.uint(1), Cl.uint(0)], accounts.recipient).result).toStrictEqual(
      Cl.ok(Cl.bool(true)),
    );

    const unauthorizedResolve = callPublic("resolve-dispute", [Cl.uint(1), Cl.uint(0), Cl.bool(true)], accounts.sender);
    expect(unauthorizedResolve.result).toStrictEqual(Cl.error(Cl.uint(ERR_NOT_AUTHORIZED)));

    const resolveReceipt = callPublic("resolve-dispute", [Cl.uint(1), Cl.uint(0), Cl.bool(false)], accounts.deployer);
    expect(resolveReceipt.result).toStrictEqual(Cl.ok(Cl.uint(500_000)));

    const disputeCv = callReadOnly("get-dispute", [Cl.uint(1), Cl.uint(0)]);
    const disputeTuple = parseTuple(parseSome(disputeCv));
    expect(parseBool(disputeTuple["is-active"])).toBe(false);

    const arbiterCv = callReadOnly("get-arbiter", [Cl.standardPrincipal(accounts.deployer)]);
    const arbiterTuple = parseTuple(parseSome(arbiterCv));
    expect(parseUInt(arbiterTuple["total-disputes"])).toBe(1n);
  });

  it("cancel-milestone-stream is blocked while a dispute remains active", () => {
    expect(registerArbiter(10_000n).result).toStrictEqual(Cl.ok(Cl.bool(true)));

    const milestones = [makeMilestone("phase-a", 5000n), makeMilestone("phase-b", 5000n)];
    expect(createMilestoneStream(1_000_000n, milestones, accounts.deployer).result).toStrictEqual(Cl.ok(Cl.uint(1)));

    expect(callPublic("dispute-milestone", [Cl.uint(1), Cl.uint(0)], accounts.recipient).result).toStrictEqual(
      Cl.ok(Cl.bool(true)),
    );

    const cancelReceipt = callPublic("cancel-milestone-stream", [Cl.uint(1)], accounts.sender);
    expect(cancelReceipt.result).toStrictEqual(Cl.error(Cl.uint(ERR_DISPUTE_ACTIVE)));
  });

  it("cancel-milestone-stream refunds unreleased value including deterministic remainder", () => {
    const milestones = [makeMilestone("a", 3333n), makeMilestone("b", 3333n), makeMilestone("c", 3334n)];
    expect(createMilestoneStream(1_000n, milestones, null).result).toStrictEqual(Cl.ok(Cl.uint(1)));

    expect(callPublic("release-milestone", [Cl.uint(1), Cl.uint(0)], accounts.sender).result).toStrictEqual(
      Cl.ok(Cl.uint(333)),
    );

    const cancelReceipt = callPublic("cancel-milestone-stream", [Cl.uint(1)], accounts.sender);
    expect(cancelReceipt.result).toStrictEqual(Cl.ok(Cl.uint(667)));
  });

  it("resolve-dispute rejects calls when dispute is not active", () => {
    expect(registerArbiter(10_000n).result).toStrictEqual(Cl.ok(Cl.bool(true)));

    const milestones = [makeMilestone("phase-a", 5000n), makeMilestone("phase-b", 5000n)];
    expect(createMilestoneStream(1_000_000n, milestones, accounts.deployer).result).toStrictEqual(Cl.ok(Cl.uint(1)));

    const resolveReceipt = callPublic("resolve-dispute", [Cl.uint(1), Cl.uint(0), Cl.bool(true)], accounts.deployer);
    expect(resolveReceipt.result).toStrictEqual(Cl.error(Cl.uint(ERR_DISPUTE_NOT_ACTIVE)));
  });
});

function getStxBalance(simnet: Simnet, principal: string): bigint {
  const stxBalances = simnet.getAssetsMap().get("STX");
  return stxBalances?.get(principal) ?? 0n;
}

function requireAccount(accounts: Map<string, string>, key: string): string {
  const account = accounts.get(key);
  if (!account) {
    throw new Error(`missing expected account: ${key}`);
  }
  return account;
}
