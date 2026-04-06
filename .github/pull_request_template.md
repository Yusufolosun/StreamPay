## Summary of changes

<!-- Describe what this PR does and why. Link the related issue or task.
     Example: "Implements the streaming payment contract (closes #42)" -->


---

## Type of change

<!-- Put an x inside the brackets that apply: [x] -->

- [ ] `feat`     — new feature
- [ ] `fix`      — bug fix
- [ ] `security` — security patch
- [ ] `chore`    — build process, tooling, documentation, or dependency update

---

## Security checklist

> Complete every item before requesting review. A reviewer will verify these.

- [ ] No secrets, private keys, mnemonics, or API tokens appear anywhere in the diff
- [ ] The `.gitignore` was consulted — any new sensitive file patterns are covered
- [ ] No `.env` file (or variant) was added or modified; only `.env.example` may be changed

---

## Testing checklist

- [ ] `clarinet check` passes with no errors or warnings
- [ ] `clarinet test` passes (all unit tests green)
- [ ] Frontend builds without errors (`npm run build` or equivalent)
- [ ] Backend API tests pass (`npm test` in `apps/api`)
- [ ] SDK tests pass (`npm test` in `packages/sdk`)

---

## Deployment impact

<!-- Answer each question honestly; leave N/A where not applicable -->

**Does this PR require a Clarity contract redeployment?**
- [ ] Yes — mainnet redeployment needed
- [ ] Yes — testnet/devnet only
- [ ] No

**If yes, which contracts are affected and on which network?**

<!-- e.g. "streaming-payment.clar on testnet" -->

**Is a migration script required?**
- [ ] Yes (link or describe it below)
- [ ] No

---

## Commit count confirmation

- [ ] I confirm this PR contains exactly 24 commits, representing granular, independently reviewable work.

---

## Additional notes

<!-- Anything else a reviewer should know: performance tradeoffs, known
     limitations, follow-up issues, etc. -->
