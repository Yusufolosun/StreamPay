#!/usr/bin/env node
/**
 * Mainnet TOML Guard
 * Blocks TOML files containing mainnet + mnemonic or private_key
 */

const fs = require('fs');
const path = require('path');

function scanTomlForMainnetSecrets(filePath) {
  const findings = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf8').toLowerCase();
    
    // Check for mainnet + secret combination
    const hasMainnet = /mainnet/i.test(content);
    const hasMnemonic = /mnemonic/i.test(content);
    const hasPrivateKey = /private[_-]?key/i.test(content);
    
    if (hasMainnet && (hasMnemonic || hasPrivateKey)) {
      findings.push({
        hasMainnet,
        hasMnemonic,
        hasPrivateKey
      });
    }
  } catch (error) {
    // Skip unreadable files
  }
  
  return findings;
}

function main() {
  const files = process.argv.slice(2);
  
  if (files.length === 0) {
    process.exit(0);
  }
  
  let hasViolations = false;
  
  for (const file of files) {
    // Only check .toml files
    if (!file.endsWith('.toml')) {
      continue;
    }
    
    const findings = scanTomlForMainnetSecrets(file);
    
    if (findings.length > 0) {
      hasViolations = true;
      console.error('\n' + String.fromCharCode(10060) + ' BLOCKED: Mainnet deployment config with key material detected.');
      console.error('   File: ' + file);
      
      const finding = findings[0];
      if (finding.hasMnemonic) {
        console.error('   Contains: mainnet + mnemonic');
      }
      if (finding.hasPrivateKey) {
        console.error('   Contains: mainnet + private_key');
      }
    }
  }
  
  if (hasViolations) {
    console.error('\n' + String.fromCharCode(128274) + ' Mainnet deployment configs must not contain key material.');
    console.error('   Use environment variables or a secrets manager.\n');
    process.exit(1);
  }
  
  process.exit(0);
}

module.exports = { scanTomlForMainnetSecrets };

if (require.main === module) {
  main();
}
