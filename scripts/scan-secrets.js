#!/usr/bin/env node
/**
 * Secret Scanner - Main Entry Point
 * Orchestrates all secret scanning modules
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', '.secretscanrc.json');

// Import individual scanners
const { scanFileForPrivateKeys } = require('./scan-private-keys');
const { scanFileForMnemonics } = require('./scan-bip39-mnemonic');
const { scanFileForNpmTokens } = require('./scan-npm-tokens');
const { scanFileForHiroKeys } = require('./scan-hiro-keys');
const { scanFileForHighEntropy } = require('./scan-entropy');

function loadConfig() {
  try {
    const configContent = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(configContent);
  } catch (error) {
    console.error('Error loading .secretscanrc.json:', error.message);
    process.exit(1);
  }
}

function shouldExcludeFile(filePath, excludePatterns) {
  const fileName = path.basename(filePath);
  for (const pattern of excludePatterns) {
    if (pattern.startsWith('*.')) {
      const ext = pattern.slice(1);
      if (fileName.endsWith(ext)) return true;
    } else if (fileName === pattern) {
      return true;
    }
  }
  return false;
}

function main() {
  const config = loadConfig();
  const files = process.argv.slice(2);
  
  if (files.length === 0) {
    process.exit(0);
  }
  
  let hasViolations = false;
  const excludePatterns = config.excludePatterns || [];
  
  for (const file of files) {
    // Skip excluded files
    if (shouldExcludeFile(file, excludePatterns)) {
      continue;
    }
    
    // Run all scanners
    const privateKeyFindings = config.patterns.privateKey.enabled 
      ? scanFileForPrivateKeys(file) : [];
    
    const mnemonicFindings = config.patterns.bip39Mnemonic.enabled
      ? scanFileForMnemonics(file, config.patterns.bip39Mnemonic.wordCounts || [12, 24]) : [];
    
    const npmTokenFindings = config.patterns.npmAuthToken.enabled
      ? scanFileForNpmTokens(file) : [];
    
    const hiroKeyFindings = config.patterns.hiroApiKey.enabled
      ? scanFileForHiroKeys(file) : [];
    
    const entropyFindings = config.thresholds.entropy.enabled
      ? scanFileForHighEntropy(file, config) : [];
    
    // Report findings
    if (privateKeyFindings.length > 0) {
      hasViolations = true;
      console.error('\n' + String.fromCharCode(10060) + ' BLOCKED: Private key material in ' + file);
      privateKeyFindings.forEach(f => console.error('   Line ' + f.line + ': ' + f.match));
    }
    
    if (mnemonicFindings.length > 0) {
      hasViolations = true;
      console.error('\n' + String.fromCharCode(10060) + ' BLOCKED: BIP-39 mnemonic in ' + file);
      mnemonicFindings.forEach(f => console.error('   Line ' + f.line + ': ' + f.wordCount + '-word sequence'));
    }
    
    if (npmTokenFindings.length > 0) {
      hasViolations = true;
      console.error('\n' + String.fromCharCode(10060) + ' BLOCKED: npm auth token in ' + file);
      npmTokenFindings.forEach(f => console.error('   Line ' + f.line + ': ' + f.match));
    }
    
    if (hiroKeyFindings.length > 0) {
      hasViolations = true;
      console.error('\n' + String.fromCharCode(10060) + ' BLOCKED: Hiro API key in ' + file);
      hiroKeyFindings.forEach(f => console.error('   Line ' + f.line + ': ' + f.match));
    }
    
    if (entropyFindings.length > 0) {
      hasViolations = true;
      console.error('\n' + String.fromCharCode(9888) + '  WARNING: High-entropy string in ' + file);
      entropyFindings.forEach(f => console.error('   Line ' + f.line + ': entropy=' + f.entropy));
    }
  }
  
  if (hasViolations) {
    console.error('\n' + String.fromCharCode(128274) + ' Secrets detected. Commit blocked.');
    console.error('   Remove secrets or add files to .gitignore.\n');
    process.exit(1);
  }
  
  process.exit(0);
}

if (require.main === module) {
  main();
}
