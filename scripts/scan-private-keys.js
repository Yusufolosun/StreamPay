#!/usr/bin/env node
/**
 * Secret Scanner - Detects private keys in staged files
 * Part of the StreamPay pre-commit security suite
 * 
 * This module scans for PEM-encoded private key material including:
 * - RSA private keys
 * - EC private keys
 * - DSA private keys
 * - OpenSSH private keys
 * - PGP private keys
 * - Encrypted private keys
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', '.secretscanrc.json');

/**
 * Load configuration from .secretscanrc.json
 */
function loadConfig() {
  try {
    const configContent = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(configContent);
  } catch (error) {
    console.error('Error loading .secretscanrc.json:', error.message);
    process.exit(1);
  }
}

/**
 * Private key detection patterns
 */
const PRIVATE_KEY_PATTERNS = [
  /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/,
  /-----BEGIN\s+EC\s+PRIVATE\s+KEY-----/,
  /-----BEGIN\s+DSA\s+PRIVATE\s+KEY-----/,
  /-----BEGIN\s+OPENSSH\s+PRIVATE\s+KEY-----/,
  /-----BEGIN\s+PGP\s+PRIVATE\s+KEY\s+BLOCK-----/,
  /-----BEGIN\s+ENCRYPTED\s+PRIVATE\s+KEY-----/
];

/**
 * Scan a file for private key material
 * @param {string} filePath - Path to the file to scan
 * @returns {Array<{line: number, match: string}>} - Array of findings
 */
function scanFileForPrivateKeys(filePath) {
  const findings = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      for (const pattern of PRIVATE_KEY_PATTERNS) {
        if (pattern.test(line)) {
          findings.push({
            line: index + 1,
            match: line.trim().substring(0, 60) + (line.length > 60 ? '...' : '')
          });
          break;
        }
      }
    });
  } catch (error) {
    // Skip files that can't be read (binary files, etc.)
    if (error.code !== 'ENOENT') {
      // Silently skip unreadable files
    }
  }
  
  return findings;
}

/**
 * Main function - scan all provided files
 */
function main() {
  const config = loadConfig();
  
  // Check if private key scanning is enabled
  if (!config.patterns.privateKey.enabled) {
    process.exit(0);
  }
  
  const files = process.argv.slice(2);
  
  if (files.length === 0) {
    process.exit(0);
  }
  
  let hasViolations = false;
  
  for (const file of files) {
    const findings = scanFileForPrivateKeys(file);
    
    if (findings.length > 0) {
      hasViolations = true;
      console.error(`\n❌ BLOCKED: Private key material detected in ${file}`);
      findings.forEach(finding => {
        console.error(`   Line ${finding.line}: ${finding.match}`);
      });
    }
  }
  
  if (hasViolations) {
    console.error('\n🔒 Private keys must not be committed to the repository.');
    console.error('   Remove the key material or add the file to .gitignore.\n');
    process.exit(1);
  }
  
  process.exit(0);
}

module.exports = { scanFileForPrivateKeys, loadConfig };

if (require.main === module) {
  main();
}
