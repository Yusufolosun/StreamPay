#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

NETWORK="mainnet"
DRY_RUN="false"
SKIP_TESTS="false"
COST_MODE="manual"

MAINNET_RPC_DEFAULT="https://api.hiro.so"
TESTNET_RPC_DEFAULT="https://api.testnet.hiro.so"

usage() {
	cat <<EOF
Usage: ./scripts/deploy.sh [options]

Options:
  --network <mainnet|testnet>   Target network (default: mainnet)
  --cost <manual|low|medium|high>  Deployment fee mode (default: manual)
  --dry-run                     Generate and check deployment plan only
  --skip-tests                  Skip npm test + clarinet check preflight
  -h, --help                    Show this help message

Environment:
  DEPLOYER_MNEMONIC             Required for deployment plan generation
  DEPLOYER_ADDRESS              Optional, used for post-deploy init instructions
  MAINNET_RPC_URL               Optional override (mainnet only)
  TESTNET_RPC_URL               Optional override (testnet only)
  SBTC_TOKEN_CONTRACT           Optional, used in post-deploy whitelist reminder
EOF
}

while [[ $# -gt 0 ]]; do
	case "$1" in
		--network)
			NETWORK="$2"
			shift 2
			;;
		--cost)
			COST_MODE="$2"
			shift 2
			;;
		--dry-run)
			DRY_RUN="true"
			shift
			;;
		--skip-tests)
			SKIP_TESTS="true"
			shift
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

if [[ "$NETWORK" != "mainnet" && "$NETWORK" != "testnet" ]]; then
	echo "Unsupported network: $NETWORK" >&2
	exit 1
fi

if [[ "$COST_MODE" != "manual" && "$COST_MODE" != "low" && "$COST_MODE" != "medium" && "$COST_MODE" != "high" ]]; then
	echo "Unsupported cost mode: $COST_MODE" >&2
	exit 1
fi

if ! command -v clarinet >/dev/null 2>&1; then
	echo "clarinet is required but not installed." >&2
	exit 1
fi

if [[ -z "${DEPLOYER_MNEMONIC:-}" ]]; then
	echo "DEPLOYER_MNEMONIC is required." >&2
	exit 1
fi

MNEMONIC_WORD_COUNT="$(wc -w <<<"$DEPLOYER_MNEMONIC" | tr -d ' ')"
if [[ "$MNEMONIC_WORD_COUNT" != "12" && "$MNEMONIC_WORD_COUNT" != "15" && "$MNEMONIC_WORD_COUNT" != "18" && "$MNEMONIC_WORD_COUNT" != "21" && "$MNEMONIC_WORD_COUNT" != "24" ]]; then
	echo "DEPLOYER_MNEMONIC has invalid word count: $MNEMONIC_WORD_COUNT" >&2
	exit 1
fi

SETTINGS_FILE="$CONTRACTS_DIR/settings/$(tr '[:lower:]' '[:upper:]' <<<"${NETWORK:0:1}")${NETWORK:1}.toml"
BACKUP_FILE=""

cleanup_settings() {
	if [[ -n "$BACKUP_FILE" && -f "$BACKUP_FILE" ]]; then
		mv "$BACKUP_FILE" "$SETTINGS_FILE"
	else
		rm -f "$SETTINGS_FILE"
	fi
}

trap cleanup_settings EXIT

if [[ -f "$SETTINGS_FILE" ]]; then
	BACKUP_FILE="$SETTINGS_FILE.bak.$(date +%s)"
	cp "$SETTINGS_FILE" "$BACKUP_FILE"
fi

RPC_URL="$MAINNET_RPC_DEFAULT"
if [[ "$NETWORK" == "testnet" ]]; then
	RPC_URL="$TESTNET_RPC_DEFAULT"
fi

if [[ "$NETWORK" == "mainnet" && -n "${MAINNET_RPC_URL:-}" ]]; then
	RPC_URL="$MAINNET_RPC_URL"
fi

if [[ "$NETWORK" == "testnet" && -n "${TESTNET_RPC_URL:-}" ]]; then
	RPC_URL="$TESTNET_RPC_URL"
fi

cat >"$SETTINGS_FILE" <<EOF
[network]
name = "$NETWORK"
stacks_node_rpc_address = "$RPC_URL"

[accounts.deployer]
mnemonic = "$DEPLOYER_MNEMONIC"
balance = 100_000_000_000_000
EOF

echo "==> Network: $NETWORK"
echo "==> RPC: $RPC_URL"

if [[ "$SKIP_TESTS" != "true" ]]; then
	echo "==> Running preflight test suite"
	(
		cd "$CONTRACTS_DIR"
		npm test
	)

	echo "==> Running clarinet check"
	(
		cd "$CONTRACTS_DIR"
		clarinet check
	)
else
	echo "==> Skipping tests by request"
fi

echo "==> Generating deployment plan"
GENERATE_FLAG="--$NETWORK"
COST_FLAG="--manual-cost"
if [[ "$COST_MODE" == "low" ]]; then COST_FLAG="--low-cost"; fi
if [[ "$COST_MODE" == "medium" ]]; then COST_FLAG="--medium-cost"; fi
if [[ "$COST_MODE" == "high" ]]; then COST_FLAG="--high-cost"; fi

(
	cd "$CONTRACTS_DIR"
	clarinet deployments generate "$GENERATE_FLAG" "$COST_FLAG" -m Clarinet.toml
)

# Fix Windows backslash paths in generated YAML files.
# Clarinet on Windows emits paths like `ontracts\\stream-core.clar` because YAML
# treats \c as an escape sequence. Normalize all contract paths to forward slashes.
echo "==> Fixing Windows paths in generated deployment plans"
for plan_file in "$CONTRACTS_DIR"/deployments/*.yaml; do
	if [[ -f "$plan_file" ]]; then
		sed -i 's|ontracts\\\\|contracts/|g; s|contracts\\\\|contracts/|g' "$plan_file"
	fi
done

# Enforce minimum cost floor of 2.2 STX (2,200,000 µSTX) per contract publish.
# Clarinet's estimated costs are often too low for timely mainnet confirmation.
MIN_COST_USTX=2200000
MAINNET_PLAN="$CONTRACTS_DIR/deployments/default.${NETWORK}-plan.yaml"
if [[ -f "$MAINNET_PLAN" ]]; then
	echo "==> Enforcing minimum cost floor: 2.2 STX ($MIN_COST_USTX µSTX) per contract"
	awk -v min="$MIN_COST_USTX" '/^[[:space:]]*cost:/ {
		match($0, /cost: *([0-9]+)/, arr);
		if (arr[1]+0 < min) {
			sub(/cost: *[0-9]+/, "cost: " min);
			print "    Bumped cost from " arr[1] " to " min > "/dev/stderr";
		}
	} {print}' "$MAINNET_PLAN" > "${MAINNET_PLAN}.tmp" && mv "${MAINNET_PLAN}.tmp" "$MAINNET_PLAN"
fi

echo "==> Validating deployment format"
(
	cd "$CONTRACTS_DIR"
	clarinet deployments check -m Clarinet.toml
)

if [[ "$DRY_RUN" == "true" ]]; then
	echo "Dry run completed. Deployment plan generated but not applied."
	exit 0
fi

echo "==> Applying deployment plan"
(
	cd "$CONTRACTS_DIR"
	clarinet deployments apply "$GENERATE_FLAG" -m Clarinet.toml --no-dashboard -d
)

DEPLOYER_LABEL="${DEPLOYER_ADDRESS:-<DEPLOYER_ADDRESS>}"

echo
echo "Deployment apply completed."
echo "Post-deploy required calls:"
echo "1) stream-core.initialize-stream-nft-contract with ${DEPLOYER_LABEL}.stream-nft"
echo "2) stream-nft.initialize-stream-core with ${DEPLOYER_LABEL}.stream-core"
if [[ -n "${SBTC_TOKEN_CONTRACT:-}" ]]; then
	echo "3) stream-core.whitelist-token with ${SBTC_TOKEN_CONTRACT}"
else
	echo "3) stream-core.whitelist-token with your deployed sBTC contract principal"
fi
