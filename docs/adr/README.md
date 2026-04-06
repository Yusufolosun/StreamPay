# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for the StreamPay
project. ADRs document significant architectural decisions along with their
context and consequences.

## What is an ADR?

An Architecture Decision Record captures an important architectural decision
made along with its context and consequences. It helps future maintainers
understand why decisions were made.

## ADR Format

Each ADR follows this template:

```markdown
# ADR-NNNN: Title

## Status

Proposed | Accepted | Deprecated | Superseded

## Context

What is the issue that we're seeing that is motivating this decision?

## Decision

What is the change that we're proposing and/or doing?

## Consequences

What becomes easier or more difficult because of this change?
```

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [0001](0001-monorepo-structure.md) | Monorepo Structure | Accepted |
| [0002](0002-clarity-contract-architecture.md) | Clarity Contract Architecture | Proposed |

## Creating a New ADR

1. Copy `_template.md` to `NNNN-title-with-dashes.md`
2. Fill in the sections
3. Add to the index above
4. Submit for review
