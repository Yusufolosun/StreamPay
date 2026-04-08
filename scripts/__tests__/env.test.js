/**
 * StreamPay - Environment Scripts Test Suite
 *
 * Tests for check-env.js and setup-env.js functionality.
 *
 * Run with: npm run test:env
 */

const { execSync } = require('child_process');
const path = require('path');

// ANSI color codes
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const RESET = '\x1b[0m';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`${GREEN}✓${RESET} ${name}`);
    passed++;
  } catch (error) {
    console.log(`${RED}✗${RESET} ${name}`);
    console.log(`  Error: ${error.message}`);
    failed++;
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}\n  Expected: ${expected}\n  Actual: ${actual}`);
  }
}

console.log('\n=== Environment Scripts Tests ===\n');

// Test 1: check-env.js should exit with code 0 when all files are valid
test('check-env.js exits with code 0 for valid .env.example files', () => {
  const result = execSync('node scripts/check-env.js', {
    cwd: path.join(__dirname, '..', '..'),
    encoding: 'utf8',
  });
  // If we get here without throwing, the script succeeded
});

// Test 2: check-env.js output should contain all expected workspaces
test('check-env.js validates all workspace .env.example files', () => {
  const result = execSync('node scripts/check-env.js', {
    cwd: path.join(__dirname, '..', '..'),
    encoding: 'utf8',
  });
  const expectedPaths = [
    'apps/web/.env.example',
    'apps/api/.env.example',
    'contracts/.env.example',
    'packages/sdk/.env.example',
  ];
  expectedPaths.forEach((p) => {
    if (!result.includes(p)) {
      throw new Error(`Missing validation for ${p}`);
    }
  });
});

// Test 3: setup-env.js should be importable (syntax check)
test('setup-env.js has valid JavaScript syntax', () => {
  require('../setup-env.js');
});

// Test 4: check-env.js should be importable (syntax check)
test('check-env.js has valid JavaScript syntax', () => {
  // This test would fail if there are syntax errors
  const checkEnvPath = path.join(__dirname, '..', 'check-env.js');
  require(checkEnvPath);
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);

if (failed > 0) {
  process.exit(1);
}
