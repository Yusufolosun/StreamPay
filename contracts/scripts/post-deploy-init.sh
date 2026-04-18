#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────────────────────
# StreamPay Post-Deployment Initialization Script
# ────────────────────────────────────────────────────────────────────────────────
#
# Executes the three required post-deployment initialization transactions:
#   1. stream-nft.initialize-stream-core    — binds NFT contract to stream-core
#   2. stream-core.initialize-stream-nft-contract — binds core to NFT contract
#   3. stream-core.whitelist-token           — whitelists sBTC for SIP-010 streams
#
# Prerequisites:
#   - All three contracts deployed to the target network
#   - DEPLOYER_ADDRESS environment variable set (SP... for mainnet)
#   - SBTC_TOKEN_CONTRACT environment variable set (SP<addr>.sbtc-token)
#   - Stacks CLI or equivalent available to broadcast transactions
#
# Usage:
#   export DEPLOYER_ADDRESS="SP..."
#   export SBTC_TOKEN_CONTRACT="SP....sbtc-token"
#   ./scripts/post-deploy-init.sh [--network mainnet|testnet]
#
# ────────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Parse arguments ──────────────────────────────────────────────────────────

NETWORK="mainnet"

while [[ $# -gt 0 ]]; do
	case "$1" in
		--network)
			NETWORK="$2"
			shift 2
			;;
		*)
			echo "Unknown argument: $1" >&2
			exit 1
			;;
	esac
done

# ── Validate environment ────────────────────────────────────────────────────

if [[ -z "${DEPLOYER_ADDRESS:-}" ]]; then
	echo "[ERROR] DEPLOYER_ADDRESS is required." >&2
	echo "  export DEPLOYER_ADDRESS=\"SP...\"" >&2
	exit 1
fi

if [[ -z "${SBTC_TOKEN_CONTRACT:-}" ]]; then
	echo "[WARN] SBTC_TOKEN_CONTRACT not set. Token whitelisting will be skipped." >&2
fi

# ── Derive contract principals ──────────────────────────────────────────────

STREAM_CORE="${DEPLOYER_ADDRESS}.stream-core"
STREAM_NFT="${DEPLOYER_ADDRESS}.stream-nft"

echo "═══════════════════════════════════════════════════════════════════════"
echo "  StreamPay Post-Deployment Initialization"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""
echo "  Network:          ${NETWORK}"
echo "  Deployer:         ${DEPLOYER_ADDRESS}"
echo "  stream-core:      ${STREAM_CORE}"
echo "  stream-nft:       ${STREAM_NFT}"
echo "  sBTC contract:    ${SBTC_TOKEN_CONTRACT:-<not set>}"
echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo ""

# ── Step 1: Initialize stream-nft with stream-core principal ────────────────

echo "[1/3] Calling stream-nft.initialize-stream-core(${STREAM_CORE})"
echo ""
echo "  Transaction payload:"
echo "    Contract:  ${STREAM_NFT}"
echo "    Function:  initialize-stream-core"
echo "    Argument:  (principal '${STREAM_CORE})"
echo ""
echo "  Submit via Stacks Explorer, Hiro Wallet, or stx CLI:"
echo "    stx call_contract_func \\"
echo "      ${STREAM_NFT} \\"
echo "      initialize-stream-core \\"
echo "      \"'${STREAM_CORE}\" \\"
echo "      --network ${NETWORK}"
echo ""

# ── Step 2: Initialize stream-core with stream-nft principal ────────────────

echo "[2/3] Calling stream-core.initialize-stream-nft-contract(${STREAM_NFT})"
echo ""
echo "  Transaction payload:"
echo "    Contract:  ${STREAM_CORE}"
echo "    Function:  initialize-stream-nft-contract"
echo "    Argument:  (principal '${STREAM_NFT})"
echo ""
echo "  Submit via Stacks Explorer, Hiro Wallet, or stx CLI:"
echo "    stx call_contract_func \\"
echo "      ${STREAM_CORE} \\"
echo "      initialize-stream-nft-contract \\"
echo "      \"'${STREAM_NFT}\" \\"
echo "      --network ${NETWORK}"
echo ""

# ── Step 3: Whitelist sBTC token ────────────────────────────────────────────

if [[ -n "${SBTC_TOKEN_CONTRACT:-}" ]]; then
	echo "[3/3] Calling stream-core.whitelist-token(${SBTC_TOKEN_CONTRACT})"
	echo ""
	echo "  Transaction payload:"
	echo "    Contract:  ${STREAM_CORE}"
	echo "    Function:  whitelist-token"
	echo "    Argument:  (principal '${SBTC_TOKEN_CONTRACT})"
	echo ""
	echo "  Submit via Stacks Explorer, Hiro Wallet, or stx CLI:"
	echo "    stx call_contract_func \\"
	echo "      ${STREAM_CORE} \\"
	echo "      whitelist-token \\"
	echo "      \"'${SBTC_TOKEN_CONTRACT}\" \\"
	echo "      --network ${NETWORK}"
	echo ""
else
	echo "[3/3] Skipped — SBTC_TOKEN_CONTRACT not configured"
	echo ""
fi

# ── Post-Init Verification ──────────────────────────────────────────────────

echo "═══════════════════════════════════════════════════════════════════════"
echo "  POST-INIT VERIFICATION CHECKLIST"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""
echo "  After all transactions confirm, verify the following:"
echo ""
echo "  □ stream-nft.get-initialisation-status returns is-initialised: true"
echo "  □ stream-nft.get-initialisation-status returns stream-core-contract: ${STREAM_CORE}"
echo "  □ stream-core.get-stream(0) returns none (no streams yet)"
if [[ -n "${SBTC_TOKEN_CONTRACT:-}" ]]; then
	echo "  □ stream-core.get-whitelisted-tokens(${SBTC_TOKEN_CONTRACT}) returns (some true)"
fi
echo ""
echo "  Run the verification script for automated checks:"
echo "    ./scripts/verify.sh --deployer \"${DEPLOYER_ADDRESS}\""
echo ""
echo "═══════════════════════════════════════════════════════════════════════"
