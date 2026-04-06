#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// BIP-39 English wordlist (2048 words)
// This is the standard English wordlist from BIP-39 specification
const BIP39_WORDLIST = [
  'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
  'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
  'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual',
  'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance',
  'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent',
  'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album',
  'alcohol', 'alert', 'alien', 'all', 'alley', 'allow', 'almost', 'alone',
  'alpha', 'already', 'also', 'alter', 'always', 'amateur', 'amazing', 'among',
  'amount', 'amused', 'analyst', 'anchor', 'ancient', 'anger', 'angle', 'angry',
  'animal', 'ankle', 'announce', 'annual', 'another', 'answer', 'antenna', 'antique',
  'anxiety', 'any', 'apart', 'apology', 'appear', 'apple', 'approve', 'april',
  'arch', 'arctic', 'area', 'arena', 'argue', 'arm', 'armed', 'armor',
  'army', 'around', 'arrange', 'arrest', 'arrive', 'arrow', 'art', 'artefact',
  'artist', 'artwork', 'ask', 'aspect', 'assault', 'asset', 'assist', 'assume',
  'asthma', 'athlete', 'atom', 'attack', 'attend', 'attitude', 'attract', 'auction',
  'audit', 'august', 'aunt', 'author', 'auto', 'autumn', 'average', 'avocado',
  'avoid', 'awake', 'aware', 'away', 'awesome', 'awful', 'awkward', 'axis'
];

const CONFIG_PATH = path.join(__dirname, '..', '.secretscanrc.json');

function loadConfig() {
  try {
    const configContent = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(configContent);
  } catch (error) {
    console.error('Error loading .secretscanrc.json:', error.message);
    process.exit(1);
  }
}

// Check if word is in BIP-39 wordlist
function isBip39Word(word) {
  return BIP39_WORDLIST.includes(word.toLowerCase());
}

// Detect potential mnemonic sequences
function detectMnemonicSequence(text, wordCounts) {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const findings = [];
  
  for (const targetCount of wordCounts) {
    for (let i = 0; i <= words.length - targetCount; i++) {
      const sequence = words.slice(i, i + targetCount);
      const bip39Matches = sequence.filter(isBip39Word).length;
      
      // If 90%+ of words match BIP-39 wordlist, flag as potential mnemonic
      if (bip39Matches >= targetCount * 0.9) {
        findings.push({
          wordCount: targetCount,
          matchRatio: bip39Matches / targetCount,
          preview: sequence.slice(0, 3).join(' ') + '...'
        });
      }
    }
  }
  
  return findings;
}

function scanFileForMnemonics(filePath, wordCounts) {
  const findings = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const detected = detectMnemonicSequence(line, wordCounts);
      detected.forEach(d => {
        findings.push({
          line: index + 1,
          wordCount: d.wordCount,
          preview: d.preview
        });
      });
    });
  } catch (error) {
    // Skip unreadable files
  }
  
  return findings;
}

function main() {
  const config = loadConfig();
  
  if (!config.patterns.bip39Mnemonic.enabled) {
    process.exit(0);
  }
  
  const wordCounts = config.patterns.bip39Mnemonic.wordCounts || [12, 24];
  const files = process.argv.slice(2);
  
  if (files.length === 0) {
    process.exit(0);
  }
  
  let hasViolations = false;
  
  for (const file of files) {
    const findings = scanFileForMnemonics(file, wordCounts);
    
    if (findings.length > 0) {
      hasViolations = true;
      console.error('\n' + String.fromCharCode(10060) + ' BLOCKED: Potential BIP-39 mnemonic detected in ' + file);
      findings.forEach(finding => {
        console.error('   Line ' + finding.line + ': ' + finding.wordCount + '-word sequence starting with "' + finding.preview + '"');
      });
    }
  }
  
  if (hasViolations) {
    console.error('\n' + String.fromCharCode(128274) + ' Mnemonic seed phrases must not be committed.');
    console.error('   Remove the seed phrase or use environment variables.\n');
    process.exit(1);
  }
  
  process.exit(0);
}

module.exports = { scanFileForMnemonics, detectMnemonicSequence };

if (require.main === module) {
  main();
}
