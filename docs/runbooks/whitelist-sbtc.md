# Whitelist sBTC After Deployment

FIRST post-deployment action:

```bash
export SBTC_CONTRACT_ADDRESS=SP...sbtc-token
```

Then run:

```bash
(contract-call? .stream-core whitelist-token ${SBTC_CONTRACT_ADDRESS})
```

The deployment pipeline should substitute the deployed sBTC contract principal into `SBTC_CONTRACT_ADDRESS`. Do not hardcode the address in source.
