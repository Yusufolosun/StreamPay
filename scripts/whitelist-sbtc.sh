#!/usr/bin/env bash
set -euo pipefail

: "${SBTC_CONTRACT_ADDRESS:?Set SBTC_CONTRACT_ADDRESS to the deployed sBTC contract principal before running this script.}"

echo "FIRST post-deployment action:"
echo "(contract-call? .stream-core whitelist-token ${SBTC_CONTRACT_ADDRESS})"
