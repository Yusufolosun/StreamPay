# @streampay/api

Express API for indexed StreamPay data.

## Startup Contract

The server validates its environment at startup through `src/config.ts` and refuses to boot if any required variable is missing or malformed.

Required variables include:

- `PORT`
- `NODE_ENV`
- `STACKS_NETWORK`
- `HIRO_API_URL`
- `CONTRACT_STREAM_CORE`
- `CONTRACT_STREAM_CONDITIONS`
- `CONTRACT_STREAM_NFT`
- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGINS`

`HIRO_API_KEY` is required in production and optional in non-production environments.

## Middleware Order

The Express factory in `src/app.ts` applies middleware in this order:

1. `helmet()`
2. `cors()` restricted to `CORS_ORIGINS`
3. `express.json({ limit: "100kb" })`
4. `requestLogger`
5. `publicRateLimiter`
6. Route handlers
7. `errorHandler` as the final middleware

## Routes

- `GET /health` returns server uptime and Stacks node reachability
- `GET /streams` and `GET /streams/:streamId` return a standardized 501 while the indexer is disconnected
- `GET /milestones` and `GET /milestones/:milestoneId` return a standardized 501 while the indexer is disconnected
- `POST /webhooks` accepts and acknowledges webhook traffic with the write limiter applied

## Commands

- `npm run dev --workspace apps/api`
- `npm run build --workspace apps/api`
- `npm run test --workspace apps/api`
- `npm run typecheck --workspace apps/api`
