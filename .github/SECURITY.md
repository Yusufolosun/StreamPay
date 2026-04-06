# Security Policy

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

If you discover a security issue in StreamPay, please disclose it privately by
emailing **security@streampay.btc**. Include as much detail as possible so we
can reproduce and assess the impact quickly:

- A clear description of the vulnerability
- Steps to reproduce (proof-of-concept code or transaction if applicable)
- The potential impact (fund loss, key exposure, denial of service, etc.)
- Any suggested mitigations you have identified

We treat every report seriously and will keep your identity confidential unless
you explicitly ask to be credited in the advisory.

---

## Scope

The following components are in scope for responsible disclosure:

| Component | Description |
|-----------|-------------|
| **Smart contracts** | All Clarity contracts under `contracts/` deployed on Stacks mainnet or testnet |
| **SDK** | The `packages/sdk` npm package and any helper libraries it exposes |
| **Frontend** | The Next.js application under `apps/web` (XSS, wallet interaction flaws, CSP bypass) |

The following are **out of scope**:

- Bugs in third-party dependencies that have already been publicly disclosed
  (please report those upstream and open a regular issue for us to update)
- Social engineering attacks against StreamPay team members
- Physical attacks against infrastructure
- Denial-of-service attacks that require sustained high traffic

---

## Response Timeline

| Milestone | Commitment |
|-----------|------------|
| Initial acknowledgement | Within **48 hours** of receiving the report |
| Triage and severity assessment | Within **5 business days** |
| Patch for **critical** issues | Within **14 days** of confirmed triage |
| Patch for **high** issues | Within **30 days** of confirmed triage |
| Patch for **medium / low** issues | Scheduled in the next regular release cycle |
| Public advisory | After the patch is released and users have had time to update |

We follow [Semantic Versioning](https://semver.org/) and will issue a patch
release for any confirmed vulnerability, regardless of severity.

---

## Severity Definitions

We use the [CVSS v3.1](https://www.first.org/cvss/calculator/3.1) framework to
score severity. As a rough guide for Stacks/smart-contract context:

- **Critical** — direct loss of user funds, private key extraction, or contract
  takeover on mainnet
- **High** — indirect fund risk, privileged action bypass, or data exfiltration
- **Medium** — degraded functionality, DoS with limited impact, or information
  disclosure that aids further attacks
- **Low** — minor information leakage, hardening gaps, or issues requiring
  significant preconditions

---

## Safe Harbour

StreamPay will not pursue legal action against researchers who:

1. Report the issue privately before public disclosure
2. Do not exploit the vulnerability beyond what is necessary to demonstrate it
3. Do not access or modify data belonging to other users
4. Give us a reasonable time to issue a fix before disclosure

We genuinely appreciate the work of the security research community and will
publicly acknowledge researchers (with their consent) in our advisories.
