# Branch Strategy

This document describes the branching model for the StreamPay monorepo.
StreamPay is a **solo-developer project**. The model is intentionally simple:
one permanent production branch (`main`) and a set of short-lived work branches.
Deviating from this model requires a deliberate decision and an update to this file.

---

## Design Rationale

A `develop` integration branch is standard in team environments where multiple
developers need a shared staging area before code reaches `main`. For a solo
developer, `develop` adds overhead without any measurable benefit:

- There is no coordination problem to solve — one developer knows the full state
  of the codebase at all times.
- A second long-lived branch doubles the bookkeeping: every commit must
  eventually land on `main`, and merge conflicts are resolved twice.
- The CI pipeline would need to run against two branches instead of one,
  consuming extra CI minutes with zero additional safety.
- **Decision**: All short-lived branches merge directly to `main`. This is the
  simplest model that still enforces review (via pull requests) and keeps
  history clean and auditable.

---

## Permanent Branches

### `main`
- **Purpose**: Production-ready code only. Every commit on this branch reflects
  what is (or can be) deployed to mainnet.
- **This is the only permanent branch.** There is no `develop`. All short-lived
  branches are cut from `main` and merged back into `main`.
- **Protection rules**:
  - Requires a pull request for significant changes; direct push only for trivial
    config/docs tasks where a PR would add no value (as in this task)
  - Status checks (CI, Clarinet tests) must pass before merge
  - Branch history must be linear (squash or rebase merges only)

---

## Short-lived Branch Prefixes

### `feat/<task-number>-<short-description>`
- **Purpose**: New features and enhancements.
- **Branch from**: `main`
- **Merge into**: `main` via pull request
- **Examples**:
  - `feat/08-stream-core-contract`
  - `feat/56-frontend-dashboard`

### `fix/<task-number>-<short-description>`
- **Purpose**: Bug fixes. All bug fixes — whether hotfixes or planned — target
  `main` directly. There is no `develop` to back-merge into.
- **Branch from**: `main`
- **Merge into**: `main` via pull request
- **Examples**:
  - `fix/15-claim-arithmetic`
  - `fix/91-escrow-release-overflow`

### `security/<task-number>-<short-description>`
- **Purpose**: Security patches. Fast-track review: a single review is
  sufficient. Do not delay merging a critical patch while waiting for a full
  CI queue — speed of deployment matters for security fixes.
- **Branch from**: `main` (patches must reach production as fast as possible)
- **Merge into**: `main` via pull request (fast-tracked, no back-merge needed)
- **Examples**:
  - `security/46-api-hardening`
  - `security/rotate-npm-token`

### `chore/<task-number>-<short-description>`
- **Purpose**: Housekeeping, configuration, documentation, or dependency updates
  that do not change production code logic.
- **Branch from**: `main`
- **Merge into**: `main` via pull request (or direct push if trivial)
- **Examples**:
  - `chore/04-monorepo-scaffold`
  - `chore/19-update-eslint-rules`

---

## Naming Rules

- Always include the task number in the prefix (e.g., `feat/08-stream-core-contract`)
- Use lowercase letters, numbers, and hyphens only — no slashes beyond the prefix
- Keep descriptions short and descriptive (3–5 words max after the task number)
- Link the branch name to a GitHub issue or Linear task number where possible

---

## Merge Strategy

| Target branch | Strategy     | Rationale                                      |
|---------------|--------------|------------------------------------------------|
| `main`        | Squash merge | Clean, linear history on the production branch |
| `security/*`  | Squash merge | Single focused commit on `main`                |
| `chore/*`     | Squash merge | Single unified commit for housekeeping tasks   |
