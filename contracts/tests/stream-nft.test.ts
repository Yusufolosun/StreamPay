import { initSimnet, type ParsedTransactionResult, type Simnet } from "@hirosystems/clarinet-sdk";
import { Cl, ClarityType, type ClarityValue } from "@stacks/transactions";
import { beforeEach, describe, expect, it } from "vitest";

const CONTRACT = "stream-nft";
const DEFAULT_DEPLOYER_MNEMONIC =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

const ERR_NOT_AUTHORISED = 1000n;
const ERR_TOKEN_NOT_FOUND = 1001n;
const ERR_ZERO_ADDRESS = 1005n;
const ERR_ALREADY_INITIALISED = 1007n;
const ERR_INVALID_CORE_CONTRACT = 1009n;

type Accounts = {
  deployer: string;
  sender: string;
  recipient: string;
};

describe("stream-nft", () => {
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

  const callReadOnly = (method: string, args: ClarityValue[], caller = accounts.deployer): ClarityValue => {
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

  it("read-only defaults are safe before initialization", () => {
    expect(callReadOnly("get-last-token-id", [])).toStrictEqual(Cl.ok(Cl.uint(0)));
    expect(callReadOnly("get-owner", [Cl.uint(1)])).toStrictEqual(Cl.ok(Cl.none()));
    expect(callReadOnly("get-token-uri", [Cl.uint(1)])).toStrictEqual(Cl.ok(Cl.none()));
    expect(callReadOnly("get-stream-for-token", [Cl.uint(1)])).toStrictEqual(Cl.ok(Cl.none()));

    const tokensForStream = callReadOnly("get-tokens-for-stream", [Cl.uint(1)]);
    expect(tokensForStream.type).toBe(ClarityType.List);
    expect(tokensForStream.value.length).toBe(0);
  });

  it("initialize-stream-core is owner-only and one-time", () => {
    const corePrincipal = Cl.contractPrincipal(accounts.deployer, "stream-core");

    const nonOwnerAttempt = callPublic("initialize-stream-core", [corePrincipal], accounts.sender);
    expect(nonOwnerAttempt.result).toStrictEqual(Cl.error(Cl.uint(ERR_NOT_AUTHORISED)));

    const initReceipt = callPublic("initialize-stream-core", [corePrincipal], accounts.deployer);
    expect(initReceipt.result).toStrictEqual(Cl.ok(Cl.bool(true)));

    const secondInit = callPublic("initialize-stream-core", [corePrincipal], accounts.deployer);
    expect(secondInit.result).toStrictEqual(Cl.error(Cl.uint(ERR_ALREADY_INITIALISED)));
  });

  it("initialize-stream-core rejects zero principal", () => {
    const zeroPrincipalAttempt = callPublic(
      "initialize-stream-core",
      [Cl.standardPrincipal("SP000000000000000000002Q6VF78")],
      accounts.deployer,
    );
    expect(zeroPrincipalAttempt.result).toStrictEqual(Cl.error(Cl.uint(ERR_ZERO_ADDRESS)));
  });

  it("get-initialisation-status reports expected values after setup", () => {
    expect(
      callPublic(
        "initialize-stream-core",
        [Cl.contractPrincipal(accounts.deployer, "stream-core")],
        accounts.deployer,
      ).result,
    ).toStrictEqual(Cl.ok(Cl.bool(true)));

    const status = parseTuple(callReadOnly("get-initialisation-status", []));
    expect(parseBool(status["is-initialised"])).toBe(true);
    if (status["stream-core-contract"].type !== ClarityType.PrincipalContract) {
      throw new Error("expected principal in initialisation status");
    }
    expect(status["stream-core-contract"].value).toBe(`${accounts.deployer}.stream-core`);
  });

  it("mint and burn are blocked when caller is not authorized core contract", () => {
    const initReceipt = callPublic(
      "initialize-stream-core",
      [Cl.contractPrincipal(accounts.deployer, "stream-core")],
      accounts.deployer,
    );
    expect(initReceipt.result).toStrictEqual(Cl.ok(Cl.bool(true)));

    const mintAttempt = callPublic(
      "mint-stream-receipt",
      [Cl.uint(1), Cl.standardPrincipal(accounts.sender), Cl.stringAscii("SENDER")],
      accounts.sender,
    );
    expect(mintAttempt.result).toStrictEqual(Cl.error(Cl.uint(ERR_NOT_AUTHORISED)));

    const burnAttempt = callPublic("burn-stream-receipt", [Cl.uint(1)], accounts.sender);
    expect(burnAttempt.result).toStrictEqual(Cl.error(Cl.uint(ERR_TOKEN_NOT_FOUND)));
  });

  it("transfer rejects unknown token ids", () => {
    const transferReceipt = callPublic(
      "transfer",
      [Cl.uint(1), Cl.standardPrincipal(accounts.sender), Cl.standardPrincipal(accounts.recipient)],
      accounts.sender,
    );
    expect(transferReceipt.result).toStrictEqual(Cl.error(Cl.uint(ERR_TOKEN_NOT_FOUND)));
  });

  it("approved operator defaults to false", () => {
    const approved = callReadOnly(
      "is-approved-operator",
      [Cl.standardPrincipal(accounts.sender), Cl.standardPrincipal(accounts.recipient)],
    );
    expect(parseBool(approved)).toBe(false);
  });

  it("read-only token lookups remain none after failed mint attempts", () => {
    expect(
      callPublic(
        "mint-stream-receipt",
        [Cl.uint(1), Cl.standardPrincipal(accounts.sender), Cl.stringAscii("SENDER")],
        accounts.sender,
      ).result,
    ).toStrictEqual(Cl.error(Cl.uint(ERR_NOT_AUTHORISED)));

    expect(callReadOnly("get-owner", [Cl.uint(1)])).toStrictEqual(Cl.ok(Cl.none()));
    expect(callReadOnly("get-token-uri", [Cl.uint(1)])).toStrictEqual(Cl.ok(Cl.none()));
    expect(callReadOnly("get-stream-for-token", [Cl.uint(1)])).toStrictEqual(Cl.ok(Cl.none()));

    const tokensForStream = callReadOnly("get-tokens-for-stream", [Cl.uint(1)]);
    expect(tokensForStream.type).toBe(ClarityType.List);
    expect(tokensForStream.value.length).toBe(0);
  });
});

function requireAccount(accounts: Map<string, string>, key: string): string {
  const account = accounts.get(key);
  if (!account) {
    throw new Error(`missing expected account: ${key}`);
  }
  return account;
}
