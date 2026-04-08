#!/usr/bin/env node

/**
 * StreamPay - Environment Variable Consistency Checker
 *
 * This script validates that all .env.example files:
 * 1. Exist in expected workspace locations
 * 2. Contain the required warning banner
 * 3. Have consistent formatting (inline comments, sections)
 * 4. Don't accidentally contain real values
 *
 * Run with: npm run check:env
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

// Expected .env.example locations
const ENV_EXAMPLE_PATHS = [
  'apps/web/.env.example',
  'apps/api/.env.example',
  'contracts/.env.example',
  'packages/sdk/.env.example',
];

// Required warning banner pattern
const WARNING_BANNER_PATTERN = /WARNING.*Copy to \.env\.local.*Never commit/i;

// Patterns that might indicate real values
const SUSPICIOUS_PATTERNS = [
  /^[A-Z_]+=sk_live_/,          // Stripe live key
  /^[A-Z_]+=pk_live_/,          // Stripe publishable live key
  /^[A-Z_]+=hiro_[a-zA-Z0-9]{20,}/,  // Real Hiro API key
  /^[A-Z_]+=[a-f0-9]{64}$/,     // 64-char hex (potential private key)
  /^DEPLOYER_MNEMONIC=\w+\s+\w+/, // Actual mnemonic words
];

let hasErrors = false;

function checkFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);

  // Check file exists
  if (!fs.existsSync(fullPath)) {
    console.log(`${RED}✗${RESET} Missing: ${filePath}`);
    hasErrors = true;
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');
  let fileHasError = false;

  // Check for warning banner
  if (!WARNING_BANNER_PATTERN.test(content)) {
    console.log(`${YELLOW}⚠${RESET} ${filePath}: Missing required warning banner`);
    fileHasError = true;
  }

  // Check for suspicious values
  lines.forEach((line, index) => {
    SUSPICIOUS_PATTERNS.forEach((pattern) => {
      if (pattern.test(line.trim())) {
        console.log(
          `${RED}✗${RESET} ${filePath}:${index + 1}: Suspicious value detected (may contain real secret)`
        );
        hasErrors = true;
        fileHasError = true;
      }
    });
  });

  // Check that file has section headers (good documentation)
  const hasSections = /^# ─+$/m.test(content) || /^# ={3,}/m.test(content) || /^## /m.test(content);
  if (!hasSections) {
    console.log(`${YELLOW}⚠${RESET} ${filePath}: Consider adding section headers for clarity`);
  }

  if (!fileHasError) {
    console.log(`${GREEN}✓${RESET} ${filePath}`);
  }
}

console.log('\nChecking .env.example files...\n');

ENV_EXAMPLE_PATHS.forEach(checkFile);

// Also check root .env.example if it exists
const rootEnvExample = '.env.example';
if (fs.existsSync(path.join(process.cwd(), rootEnvExample))) {
  checkFile(rootEnvExample);
}

console.log('');

if (hasErrors) {
  console.log(`${RED}Environment check failed!${RESET}`);
  process.exit(1);
} else {
  console.log(`${GREEN}All .env.example files are valid.${RESET}`);
  process.exit(0);
}
