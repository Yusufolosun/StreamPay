# ADR-0001: Monorepo Structure

## Status

Accepted

## Context

StreamPay needs a project structure that supports:

- Multiple applications (web frontend, API server)
- Shared packages (SDK, types, utilities)
- Smart contracts (Clarity)
- Independent versioning of the public SDK
- Efficient development workflows

We evaluated:

1. **Polyrepo**: Separate repositories for each component
2. **Monorepo with Lerna**: Single repo with Lerna for package management
3. **Monorepo with Turborepo**: Single repo with Turbo for builds
4. **Monorepo with npm workspaces**: Native npm workspace support

## Decision

We will use a **monorepo with npm workspaces and Turborepo** for build
orchestration.

Structure:

```
streampay/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Express API
├── packages/
│   ├── sdk/          # Public npm package
│   ├── types/        # Shared types
│   └── utils/        # Shared utilities
├── contracts/        # Clarinet project (not a workspace)
└── docs/             # Documentation
```

Key decisions:

1. **Turborepo** for build caching and task orchestration
2. **npm workspaces** for dependency management (native, no extra tools)
3. **Contracts outside workspaces** - Clarinet has its own tooling
4. **Scoped packages** - `@streampay/*` for internal packages

## Consequences

### Positive

- Single source of truth for all code
- Atomic commits across packages
- Shared tooling and configuration
- Efficient CI with Turbo caching
- Easy cross-package refactoring

### Negative

- Larger repository size
- More complex CI configuration
- Learning curve for Turborepo
- Contracts require separate workflow

### Neutral

- SDK can still be published independently to npm
- Each workspace can have its own dependencies
- TypeScript project references enable incremental builds

## References

- [Turborepo documentation](https://turbo.build/repo/docs)
- [npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces)
- [Clarinet documentation](https://docs.hiro.so/clarinet)
