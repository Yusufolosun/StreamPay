# Toolchain Notes

This document contains the directory structure and toolchain configuration
for the StreamPay monorepo.

## Directory Structure

```
streampay/
├── .env.example
├── .eslintrc.json
├── .github/
│   ├── CODEOWNERS
│   ├── pull_request_template.md
│   └── SECURITY.md
├── .gitattributes
├── .gitignore
├── .husky/
│   ├── commit-msg
│   └── pre-commit
├── .nvmrc
├── .prettierignore
├── .prettierrc
├── .secretscanrc.json
├── apps/
│   ├── api/
│   │   ├── package.json
│   │   ├── README.md
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── middleware/
│   │   │   │   └── index.ts
│   │   │   ├── routes/
│   │   │   │   └── index.ts
│   │   │   └── services/
│   │   │       └── index.ts
│   │   └── tsconfig.json
│   └── web/
│       ├── package.json
│       ├── public/
│       │   └── .gitkeep
│       ├── README.md
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx
│       │   │   └── page.tsx
│       │   ├── components/
│       │   │   └── index.ts
│       │   ├── hooks/
│       │   │   └── index.ts
│       │   └── lib/
│       │       └── index.ts
│       └── tsconfig.json
├── BRANCHES.md
├── contracts/
│   ├── Clarinet.toml
│   ├── contracts/
│   │   └── stream-core.clar
│   ├── README.md
│   ├── settings/
│   │   └── Devnet.toml
│   └── tests/
│       └── stream-core.test.ts
├── docs/
│   └── adr/
│       ├── _template.md
│       ├── 0001-monorepo-structure.md
│       └── README.md
├── package.json
├── packages/
│   ├── sdk/
│   │   ├── package.json
│   │   ├── README.md
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── tsconfig.cjs.json
│   │   ├── tsconfig.esm.json
│   │   ├── tsconfig.json
│   │   └── tsconfig.types.json
│   ├── types/
│   │   ├── package.json
│   │   ├── README.md
│   │   ├── src/
│   │   │   └── index.ts
│   │   └── tsconfig.json
│   └── utils/
│       ├── package.json
│       ├── README.md
│       ├── src/
│       │   └── index.ts
│       └── tsconfig.json
├── scripts/
│   ├── __tests__/
│   │   └── hooks.test.js
│   ├── bip39-wordlist.json
│   ├── guard-env-files.js
│   ├── guard-large-files.js
│   ├── guard-mainnet-toml.js
│   ├── index.js
│   ├── scan-bip39-mnemonic.js
│   ├── scan-entropy.js
│   ├── scan-hiro-keys.js
│   ├── scan-npm-tokens.js
│   ├── scan-private-keys.js
│   ├── scan-secrets.js
│   └── validate-commit-msg.js
├── SECURITY_HOOKS.md
├── TOOLCHAIN_NOTES.md
├── tsconfig.base.json
├── tsconfig.json
└── turbo.json
```

## Workspaces

The monorepo uses npm workspaces with the following structure:

| Workspace | Path | Description |
|-----------|------|-------------|
| @streampay/web | apps/web | Next.js 14 frontend |
| @streampay/api | apps/api | Express API server |
| @streampay/sdk | packages/sdk | Public npm package |
| @streampay/types | packages/types | Shared TypeScript types |
| @streampay/utils | packages/utils | Shared pure utilities |

**Note:** The `contracts/` directory is NOT a workspace package. It uses
Clarinet's own project structure and tooling.

## Build Pipeline

Turborepo orchestrates builds with the following task dependencies:

```
build:     depends on ^build (all dependencies must build first)
test:      depends on build (tests run after build)
lint:      depends on ^build
typecheck: depends on ^build
dev:       no cache, persistent (watch mode)
```

## TypeScript Configuration

- **tsconfig.base.json**: Shared strict configuration
- **tsconfig.json**: Root config with project references
- Each workspace extends the base config

## Code Quality Tools

- **ESLint**: TypeScript-aware linting
- **Prettier**: Code formatting (single quotes, 2-space indent, 100 char width)
- **Husky**: Git hooks for pre-commit checks
- **lint-staged**: Run checks on staged files only

## Node Version

Pinned to Node.js 20 LTS via `.nvmrc`.

## Security

Pre-commit hooks scan for:
- Private keys
- BIP-39 mnemonics
- npm auth tokens
- Hiro API keys
- High-entropy strings
- .env files
- Mainnet TOML configs with keys
- Large files (>500KB)

See `SECURITY_HOOKS.md` for details.
