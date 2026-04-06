# Security Pre-commit Hooks

This document describes the pre-commit security checks enforced in the StreamPay repository.
These hooks are powered by [Husky](https://typicode.github.io/husky/) and run automatically
before each commit to prevent accidental exposure of sensitive data.

---

## Overview

All checks run in sequence and halt on the first failure. This ensures that no commit
can proceed if any security violation is detected.

| Check | Description | Exit Code |
|-------|-------------|-----------|
| Secret Scanning | Detects private keys, mnemonics, API tokens | 1 |
| .env File Guard | Blocks staging of .env files | 1 |
| Mainnet TOML Guard | Blocks mainnet configs with keys | 1 |
| Large File Guard | Blocks files > 500KB | 1 |
| Conventional Commits | Validates commit message format | 1 |

---

## Check Details

### 1. Secret Scanning

**Files:** `scripts/scan-secrets.js` (orchestrator), individual scanners

Scans all staged files for potentially leaked secrets:

#### Private Key Detection
- **Pattern:** PEM-encoded private keys (RSA, EC, DSA, OpenSSH, PGP)
- **Example blocked:** `-----BEGIN RSA PRIVATE KEY-----`
- **Script:** `scripts/scan-private-keys.js`

#### BIP-39 Mnemonic Detection
- **Pattern:** Sequences of 12 or 24 words from the BIP-39 English wordlist
- **Threshold:** 90% of words must match the wordlist
- **Wordlist:** `scripts/bip39-wordlist.json` (2048 words)
- **Script:** `scripts/scan-bip39-mnemonic.js`

#### npm Auth Token Detection
- **Pattern:** `//registry.npmjs.org/:_authToken=`
- **Pattern:** `npm_` followed by 36 alphanumeric characters
- **Script:** `scripts/scan-npm-tokens.js`

#### Hiro API Key Detection
- **Pattern:** `HIRO_API_KEY`, `STACKS_API_KEY`, `X-API-KEY` with values
- **Script:** `scripts/scan-hiro-keys.js`

#### High-Entropy String Detection
- **Algorithm:** Shannon entropy calculation
- **Threshold:** Configurable in `.secretscanrc.json` (default: 4.5)
- **Minimum Length:** 20 characters
- **Script:** `scripts/scan-entropy.js`

### 2. .env File Guard

**Script:** `scripts/guard-env-files.js`

Blocks any file starting with `.env` from being committed, except:
- `.env.example` (template with placeholder values)
- `.env.template` (alternative template file)

**Error Message:**
```
BLOCKED: .env files must not be committed. Use .env.example.
```

### 3. Mainnet TOML Guard

**Script:** `scripts/guard-mainnet-toml.js`

Blocks any `.toml` file that contains both:
- The word `mainnet` (case-insensitive)
- AND either `mnemonic` or `private_key` (case-insensitive)

This prevents accidental commit of mainnet deployment configurations
that contain deployer key material.

**Error Message:**
```
BLOCKED: Mainnet deployment config with key material detected.
```

### 4. Large File Guard

**Script:** `scripts/guard-large-files.js`

Blocks any staged file larger than 500KB (configurable in `.secretscanrc.json`).

Large files should be:
- Added to Git LFS for binary assets
- Split into smaller files
- Excluded via `.gitignore`

### 5. Conventional Commits Validation

**Script:** `scripts/validate-commit-msg.js`

Validates that commit messages follow the Conventional Commits specification:

```
<type>(<scope>): <description>
```

**Valid Types:**
- `feat` - New features
- `fix` - Bug fixes
- `docs` - Documentation changes
- `chore` - Maintenance tasks
- `security` - Security improvements
- `test` - Test additions/changes
- `refactor` - Code refactoring
- `ci` - CI/CD changes

**Requirements:**
- Description must be 1-100 characters
- Scope is optional but must be in parentheses if provided

**Examples:**
```
feat(auth): add user login flow
fix: resolve crash on startup
security(hooks): add secret scanner
docs: update README with installation steps
```

---

## Configuration

All thresholds and patterns are configurable in `.secretscanrc.json`:

```json
{
  "thresholds": {
    "entropy": {
      "enabled": true,
      "minLength": 20,
      "threshold": 4.5
    },
    "largeFile": {
      "maxSizeBytes": 512000
    }
  },
  "patterns": {
    "privateKey": { "enabled": true },
    "bip39Mnemonic": { "enabled": true, "wordCounts": [12, 24] },
    "npmAuthToken": { "enabled": true },
    "hiroApiKey": { "enabled": true }
  }
}
```

---

## Emergency Bypass

In rare cases, you may need to bypass the pre-commit hooks. Use with extreme caution.

### How to Bypass

```bash
git commit --no-verify -m "your commit message"
```

Or for the short form:

```bash
git commit -n -m "your commit message"
```

### Bypass Policy

**CRITICAL: Bypassing security hooks is a serious action.**

When using `--no-verify`, you MUST:

1. **Open a security issue within 24 hours** explaining:
   - Why the bypass was necessary
   - What files were committed
   - Whether any secrets were accidentally exposed
   - Remediation steps taken

2. **Label the issue** with `security` and `hook-bypass`

3. **Notify the team** via the appropriate communication channel

### Valid Bypass Reasons

- False positive from entropy detection on legitimate data
- Committing test fixtures that intentionally contain mock secrets
- Emergency hotfix where hooks are broken (fix hooks immediately after)

### Invalid Bypass Reasons

- "The hook is too slow" — optimize the hook instead
- "It's just this once" — security must be consistent
- "I'll fix it later" — security debt accumulates fast

---

## Running Hooks Manually

You can run individual checks manually:

```bash
# Run all secret scanning
npm run scan:secrets -- file1.js file2.js

# Run specific guards
npm run guard:env -- .env.local
npm run guard:toml -- Clarinet.toml
npm run guard:size -- large-file.bin

# Run hook tests
npm run test:hooks
```

---

## Troubleshooting

### Hook Not Running

Ensure Husky is installed:

```bash
npm run prepare
```

### False Positives

If a file is being flagged incorrectly:

1. Check if the file should be in `.gitignore`
2. Review the entropy threshold in `.secretscanrc.json`
3. Add the file pattern to `excludePatterns` in config

### Windows Compatibility

These hooks are designed to work on:
- Windows (Git Bash / MINGW64)
- macOS
- Linux

If you encounter issues on Windows, ensure you're using Git Bash or WSL.

---

## Adding New Checks

To add a new security check:

1. Create a new script in `scripts/` following the existing pattern
2. Add the check to `scripts/scan-secrets.js` orchestrator
3. Update `.husky/pre-commit` to include the new check
4. Add tests in `scripts/__tests__/hooks.test.js`
5. Document the check in this file

---

## Related Files

| File | Purpose |
|------|---------|
| `.husky/pre-commit` | Pre-commit hook entry point |
| `.husky/commit-msg` | Commit message hook |
| `.secretscanrc.json` | Configuration for all checks |
| `scripts/scan-secrets.js` | Main secret scanner orchestrator |
| `scripts/scan-private-keys.js` | Private key detection |
| `scripts/scan-bip39-mnemonic.js` | Mnemonic detection |
| `scripts/scan-npm-tokens.js` | npm token detection |
| `scripts/scan-hiro-keys.js` | Hiro API key detection |
| `scripts/scan-entropy.js` | High-entropy string detection |
| `scripts/guard-env-files.js` | .env file guard |
| `scripts/guard-mainnet-toml.js` | Mainnet TOML guard |
| `scripts/guard-large-files.js` | Large file guard |
| `scripts/validate-commit-msg.js` | Commit message validator |
| `scripts/bip39-wordlist.json` | BIP-39 English wordlist |
| `scripts/__tests__/hooks.test.js` | Hook unit tests |
