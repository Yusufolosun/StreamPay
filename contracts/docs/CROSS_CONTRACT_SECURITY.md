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

The deployment must wire these principals on the same chain:
- `stream-core`: the deployed `stream-core` contract principal.
- `stream-nft`: the deployed `stream-nft` contract principal.
- `stream-conditions`: the deployed `stream-conditions` contract principal.

The repository uses contract-name references during development, but the deployed principals must match the final chain-specific contract identifiers from the deployment scripts.

## Authorised Caller Pattern

`stream-nft` accepts `mint-stream-receipt` and `burn-stream-receipt` only when `contract-caller` matches the one-time initialised `stream-core` principal stored in contract state.

That check is safe because `contract-caller` is assigned by the Clarity runtime to the immediate caller contract. It is not a user-supplied parameter, so neither `tx-sender` nor any external principal can spoof it.

The one-time initialisation guard matters because it prevents the NFT contract from being bound to the wrong core principal after deployment.

## Compromise Impact

### If `stream-core` is compromised
- Attackers could mint or burn receipt NFTs through the authorised caller path.
- They could corrupt sender synchronisation on sender-receipt transfers.
- They could alter stream state, whitelist policy, and fee/accounting invariants in the core contract itself.
- This is the highest-impact dependency because it owns the canonical stream state.

### If `stream-nft` is compromised
- Attackers could corrupt NFT ownership or metadata.
- They still cannot mint or burn without the stored `stream-core` principal calling in, so the authorised-caller check limits direct abuse of the mint/burn surface.
- Best-effort sender sync may diverge from core state, but the NFT ownership record remains the source of truth for the receipt token.

### If `stream-conditions` is compromised
- Attackers could manipulate milestone release and dispute logic for milestone-based streams.
- They could not directly bypass the `stream-nft` caller restriction.
- Damage is scoped to milestone streams and their token flows, not to the NFT authorisation boundary.

## Operational Notes

- Deploy `stream-core` first, then initialise `stream-nft` with the final `stream-core` principal.
- Refuse deployment if any expected principal is missing or points at a different chain.
- Treat any mismatch between deployed principals and the documented graph as a security incident.
