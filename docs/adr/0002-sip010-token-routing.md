# 0002 - SIP-010 token routing via typed principals

## Status

Accepted

## Context

StreamPay now supports both STX streams and SIP-010 token streams. The contracts need to remember which asset type each stream uses so claim, cancel, and milestone release paths can route transfers correctly.

Clarity does not support storing a trait reference in a map and later dynamically dispatching to an arbitrary implementation. That means the contracts cannot persist an abstract token interface and resolve it later at runtime.

## Decision

Store the token contract principal directly on each stream record and validate SIP-010 token principals against a whitelist before creation.

- `stream-core.clar` owns the whitelist map and whitelist mutation functions.
- `stream-conditions.clar` delegates whitelist checks to `stream-core.clar`.
- Stream lifecycle functions branch on the stored optional token principal to choose the STX path or the SIP-010 path.
- sBTC must be whitelisted after deployment using the deployment script, not hardcoded in source.

## Consequences

- STX streams continue to use the existing flow with no contract abstraction layer.
- SIP-010 streams remain explicit and auditable because the contract principal is stored and validated up front.
- Token policy has a single source of truth in `stream-core.clar`.
- New supported tokens can be added by whitelisting their deployed contract principal after review.
