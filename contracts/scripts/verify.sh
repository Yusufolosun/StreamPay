#!/usr/bin/env bash
set -euo pipefail

STACKS_API="${STACKS_API:-https://api.hiro.so}"
DEPLOYER_ADDRESS="${DEPLOYER_ADDRESS:-}"

usage() {
	cat <<EOF
Usage: ./scripts/verify.sh [options]

Options:
  --deployer <STX_ADDRESS>   Contract deployer address (required)
  --api <URL>                Stacks API base URL (default: https://api.hiro.so)
  -h, --help                 Show this help message

Environment fallback:
  DEPLOYER_ADDRESS
  STACKS_API
EOF
}

while [[ $# -gt 0 ]]; do
	case "$1" in
		--deployer)
			DEPLOYER_ADDRESS="$2"
			shift 2
			;;
		--api)
			STACKS_API="$2"
			shift 2
			;;
		-h|--help)
			usage
			exit 0
			;;
		*)
			echo "Unknown option: $1" >&2
			usage
			exit 1
			;;
	esac
done

if [[ -z "$DEPLOYER_ADDRESS" ]]; then
	echo "DEPLOYER_ADDRESS is required." >&2
	exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
	echo "curl is required but not installed." >&2
	exit 1
fi

VERIFY_TMPFILE="$(mktemp "${TMPDIR:-/tmp}/streampay_verify_XXXXXX.json" 2>/dev/null || echo "${TEMP:-/tmp}/streampay_verify_response.json")"
cleanup_verify() { rm -f "$VERIFY_TMPFILE"; }
trap cleanup_verify EXIT

check_endpoint() {
	local url="$1"
	local label="$2"

	local http_code
	http_code="$(curl -sS -o "$VERIFY_TMPFILE" -w "%{http_code}" "$url")"

	if [[ "$http_code" != "200" ]]; then
		echo "[FAIL] $label -> HTTP $http_code" >&2
		cat "$VERIFY_TMPFILE" >&2 || true
		exit 1
	fi

	echo "[OK]   $label"
}

echo "==> Verifying deployed contracts at $STACKS_API"

for contract in stream-core stream-conditions stream-nft; do
	check_endpoint "$STACKS_API/v2/contracts/interface/$DEPLOYER_ADDRESS/$contract" "interface $contract"
	check_endpoint "$STACKS_API/v2/contracts/source/$DEPLOYER_ADDRESS/$contract" "source $contract"
done

echo
echo "On-chain source/interface checks passed for all contracts."
echo "Recommended manual state checks:"
echo "1) Confirm stream-core.initialize-stream-nft-contract was called with $DEPLOYER_ADDRESS.stream-nft"
echo "2) Confirm stream-nft.initialize-stream-core was called with $DEPLOYER_ADDRESS.stream-core"
echo "3) Confirm stream-core.whitelist-token includes the intended sBTC contract"
