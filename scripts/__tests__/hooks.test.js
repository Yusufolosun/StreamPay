#!/usr/bin/env node
/**
 * Test suite for pre-commit security hooks
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Import modules to test
const { scanFileForPrivateKeys } = require('../scan-private-keys');
const { validateCommitMessage, VALID_TYPES } = require('../validate-commit-msg');
const { calculateEntropy } = require('../scan-entropy');
const { formatBytes } = require('../guard-large-files');
const { scanTomlForMainnetSecrets } = require('../guard-mainnet-toml');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log('  ' + String.fromCharCode(10004) + ' ' + name);
    passed++;
  } catch (error) {
    console.log('  ' + String.fromCharCode(10008) + ' ' + name);
    console.log('    Error: ' + error.message);
    failed++;
  }
}

console.log('\nRunning pre-commit hook tests...\n');

// Test commit message validation
console.log('Commit Message Validation:');

test('accepts valid feat commit', () => {
  const result = validateCommitMessage('feat(auth): add login flow');
  assert.strictEqual(result.valid, true);
});

test('accepts valid fix commit', () => {
  const result = validateCommitMessage('fix: resolve crash on startup');
  assert.strictEqual(result.valid, true);
});

test('accepts valid security commit', () => {
  const result = validateCommitMessage('security(hooks): add secret scanner');
  assert.strictEqual(result.valid, true);
});

test('rejects invalid type', () => {
  const result = validateCommitMessage('invalid: this should fail');
  assert.strictEqual(result.valid, false);
});

test('rejects missing description', () => {
  const result = validateCommitMessage('feat:');
  assert.strictEqual(result.valid, false);
});

test('allows merge commits', () => {
  const result = validateCommitMessage('Merge branch main into feature');
  assert.strictEqual(result.valid, true);
});

// Test entropy calculation
console.log('\nEntropy Calculation:');

test('calculates low entropy for repetitive string', () => {
  const entropy = calculateEntropy('aaaaaaaaaa');
  assert.ok(entropy < 1, 'Expected entropy < 1, got ' + entropy);
});

test('calculates high entropy for random string', () => {
  const entropy = calculateEntropy('aB3@kL2!mN5');
  assert.ok(entropy > 3, 'Expected entropy > 3, got ' + entropy);
});

// Test byte formatting
console.log('\nByte Formatting:');

test('formats bytes correctly', () => {
  assert.strictEqual(formatBytes(500), '500 B');
});

test('formats kilobytes correctly', () => {
  assert.strictEqual(formatBytes(1024), '1.0 KB');
});

test('formats megabytes correctly', () => {
  assert.strictEqual(formatBytes(1048576), '1.0 MB');
});

// Test VALID_TYPES constant
console.log('\nValid Types:');

test('includes all expected commit types', () => {
  const expected = ['feat', 'fix', 'docs', 'chore', 'security', 'test', 'refactor', 'ci'];
  for (const type of expected) {
    assert.ok(VALID_TYPES.includes(type), 'Missing type: ' + type);
  }
});

// Summary
console.log('\n' + '='.repeat(40));
console.log('Tests: ' + passed + ' passed, ' + failed + ' failed');
console.log('='.repeat(40) + '\n');

process.exit(failed > 0 ? 1 : 0);
