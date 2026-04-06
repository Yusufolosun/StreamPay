# @streampay/api

Node.js / Express API server for StreamPay.

## Purpose

Backend API service providing:

- **Stream Management**: CRUD operations for payment streams
- **Transaction Monitoring**: Watch for on-chain events
- **Indexing**: Index stream data for efficient querying
- **Webhooks**: Notify external services of stream events

## Tech Stack

- **Framework**: Express.js
- **Runtime**: Node.js 20+
- **Development**: tsx for TypeScript execution
- **Testing**: Vitest

## Directory Structure

```
src/
├── index.ts       # Server entry point
├── routes/        # API route handlers
├── middleware/    # Express middleware
└── services/      # Business logic services
```

## API Endpoints (Planned)

```
GET    /api/health           # Health check
GET    /api/streams          # List streams
POST   /api/streams          # Create stream
GET    /api/streams/:id      # Get stream details
DELETE /api/streams/:id      # Cancel stream
POST   /api/streams/:id/claim # Claim payment
```

## Scripts

```bash
npm run dev        # Start development server with hot reload
npm run build      # Compile TypeScript
npm run start      # Start production server
npm run lint       # Run ESLint
npm run typecheck  # TypeScript type checking
npm run test       # Run tests
```

## TODO

- [ ] Implement Express server setup
- [ ] Add stream endpoints
- [ ] Integrate with Stacks node
- [ ] Add authentication middleware
- [ ] Implement rate limiting
