# @streampay/web

Next.js 14 frontend application for StreamPay.

## Purpose

This is the main user-facing web application that provides:

- **Dashboard**: View and manage payment streams
- **Stream Creation**: Create new recurring payment streams
- **Wallet Integration**: Connect Stacks wallets (Hiro, Leather)
- **Payment Claims**: Recipients can claim accrued payments
- **History**: View transaction and stream history

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: React 18 with Server Components
- **Styling**: Tailwind CSS (TODO)
- **State**: React Query for server state (TODO)
- **Wallet**: @stacks/connect for wallet integration

## Directory Structure

```
src/
├── app/           # Next.js App Router pages
├── components/    # React components
├── hooks/         # Custom React hooks
└── lib/           # Utility functions and clients
```

## Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
npm run typecheck  # TypeScript type checking
npm run test       # Run tests
```

## TODO

- [ ] Implement wallet connection
- [ ] Create stream dashboard
- [ ] Add stream creation form
- [ ] Implement payment claiming UI
- [ ] Add transaction history view
