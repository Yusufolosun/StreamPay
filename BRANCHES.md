# Branch Strategy

This document describes the branching model for the StreamPay monorepo.
All contributors must follow these conventions. Deviating from this model
requires a team discussion and an update to this file.

---

## Permanent Branches

### `main`
- **Purpose**: Production-ready code only. Every commit on this branch reflects
  what is (or can be) deployed to mainnet.
- **Protection rules**:
  - Requires a pull request — no direct push permitted
  - Requires at least 1 approving review before merge
  - Status checks (CI, Clarinet tests) must pass before merge
  - Branch history must be linear (squash or rebase merges only)

### `develop`
- **Purpose**: Integration branch. All feature and fix branches are merged here
  first so the work is validated together before promoting to `main`.
- **Protection rules**:
  - Requires a pull request
  - CI and Clarinet tests must pass
  - Direct push by maintainers is allowed only for trivial merge conflict
    resolutions — use sparingly

---

## Short-lived Branch Prefixes

### `feat/<task-number>-<short-description>`
- **Purpose**: New features and enhancements.
- **Branch from**: `develop`
- **Merge into**: `develop` via pull request
- **Examples**:
  - `feat/42-streaming-payment-contract`
  - `feat/56-frontend-dashboard`

### `fix/<task-number>-<short-description>`
- **Purpose**: Bug fixes found in `develop` or reported against a released
  version. Hotfixes targeting `main` directly must also be back-merged into
  `develop`.
- **Branch from**: `develop` (or `main` for hotfixes)
- **Merge into**: `develop` (and `main` for hotfixes) via pull request
- **Examples**:
  - `fix/91-escrow-release-overflow`
  - `fix/103-api-rate-limit`

### `security/<short-description>`
- **Purpose**: Security patches. These follow a fast-track review process:
  a single reviewer from `@security-team` can approve and merge without
  waiting for the standard CI queue where a delay would increase exposure.
- **Branch from**: `main` (patches must reach production as fast as possible)
- **Merge into**: `main` then back-merged into `develop`
- **Examples**:
  - `security/patch-mnemonic-exposure`
  - `security/rotate-npm-token`

---

## Naming Rules

- Use lowercase letters, numbers, and hyphens only — no slashes beyond the prefix
- Keep descriptions short and descriptive (3–5 words max after the task number)
- Link the branch name to a GitHub issue or Linear task number where possible

---

## Merge Strategy

| Target branch | Strategy     | Rationale                                      |
|---------------|--------------|------------------------------------------------|
| `main`        | Squash merge | Clean, linear history on the production branch |
| `develop`     | Merge commit | Preserves feature context in the integration log |
| `security/*`  | Squash merge | Single focused commit on both `main` and `develop` |
