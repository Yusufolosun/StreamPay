# Cross-Contract Security

## Call Graph

```text
                    +----------------------------------+
                    |         stream-conditions        |
                    +----------------------------------+
                               |
                               | get-stream
                               | get-whitelisted-tokens
                               v
+----------------------------------+        mint-stream-receipt / burn-stream-receipt        +----------------------------------+
|            stream-core           | ---------------------------------------------------------> |             stream-nft           |
+----------------------------------+                                                            +----------------------------------+
                ^                                                                                               |
                |                                                                                               | transfer-stream-sender
                |                                                                                               | (best-effort)
                +-----------------------------------------------------------------------------------------------+
```

Read-only flow is acyclic:
- `stream-conditions` reads from `stream-core`.
- `stream-core` does not perform any read-only calls into `stream-nft` or `stream-conditions`.
- `stream-nft` does not depend on any read-only call from `stream-core`.

## Expected Contract Principals

Expected dependency addresses by call site:

| Caller | Dependency | Expected address in source | Expected deployed form |
| --- | --- | --- | --- |
| stream-core | stream-nft | .stream-nft | SP...stream-nft |
| stream-conditions | stream-core | .stream-core | SP...stream-core |
| stream-nft | stream-core | state var stream-core-contract set by initialize-stream-core | SP...stream-core |

All expected principals must resolve on the same chain instance. Development uses contract-name references, while deployments must substitute final chain-specific principals from deployment artifacts.

## Authorised Caller Pattern

stream-nft enforces a one-time initialisation flow:
1. is-initialised starts false.
2. initialize-stream-core stores the stream-core principal.
3. initialize-stream-core sets is-initialised to true.
4. mint-stream-receipt and burn-stream-receipt require contract-caller to equal the stored stream-core principal.

That check is safe because contract-caller is assigned by the Clarity runtime to the immediate caller contract for the current frame. It is not a user argument and cannot be set by tx-sender, post condition, memo, or calldata tricks, so it cannot be spoofed by an external account.

The one-time initialisation guard prevents rebinding the NFT contract to a different core principal after deployment.

## Compromise Impact

### If `stream-core` is compromised
- Attackers could mint or burn receipt NFTs through the authorised caller path.
- They could corrupt sender synchronisation on sender-receipt transfers.
- They could alter stream state, whitelist policy, and fee/accounting invariants in the core contract itself.
- This is the highest-impact dependency because it owns the canonical stream state.
- Immediate action: pause protocol operations and rotate to a patched deployment.

### If `stream-nft` is compromised
- Attackers could corrupt NFT ownership or metadata.
- They still cannot mint or burn without the stored `stream-core` principal calling in, so the authorised-caller check limits direct abuse of the mint/burn surface.
- Best-effort sender sync may diverge from core state, but the NFT ownership record remains the source of truth for the receipt token.
- Immediate action: disable UX paths that rely on NFT metadata until reconciliation.

### If `stream-conditions` is compromised
- Attackers could manipulate milestone release and dispute logic for milestone-based streams.
- They could not directly bypass the `stream-nft` caller restriction.
- Damage is scoped to milestone streams and their token flows, not to the NFT authorisation boundary.
- Immediate action: disable milestone-stream creation and resolve affected disputes manually.

## Operational Notes

- Deploy `stream-core` first, then initialise `stream-nft` with the final `stream-core` principal.
- Refuse deployment if any expected principal is missing or points at a different chain.
- Treat any mismatch between deployed principals and the documented graph as a security incident.
