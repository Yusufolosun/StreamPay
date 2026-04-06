#!/usr/bin/env node
/**
 * High Entropy String Scanner
 * Detects potentially leaked secrets via Shannon entropy analysis
 */

const fs = require('fs');
const path = require('path');

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

/**
 * Calculate Shannon entropy of a string
 * Higher entropy = more randomness = more likely to be a secret
 */
function calculateEntropy(str) {
  if (!str || str.length === 0) return 0;
  
  const charCounts = {};
  for (const char of str) {
    charCounts[char] = (charCounts[char] || 0) + 1;
  }
  
  let entropy = 0;
  const len = str.length;
  
  for (const count of Object.values(charCounts)) {
    const probability = count / len;
    entropy -= probability * Math.log2(probability);
  }
  
  return entropy;
}

/**
 * Extract potential secret strings from a line
 */
function extractPotentialSecrets(line) {
  const secrets = [];
  
  // Match quoted strings
  const quotedPattern = /['""]([A-Za-z0-9+/=_-]{20,})['"]/g;
  let match;
  while ((match = quotedPattern.exec(line)) !== null) {
    secrets.push({ value: match[1], position: match.index });
  }
  
  // Match assignment values
  const assignmentPattern = /[=:]\s*([A-Za-z0-9+/=_-]{20,})(?:\s|$)/g;
  while ((match = assignmentPattern.exec(line)) !== null) {
    secrets.push({ value: match[1], position: match.index });
  }
  
  return secrets;
}

function shouldExcludePath(filePath, excludePatterns) {
  const fileName = path.basename(filePath);
  for (const pattern of excludePatterns) {
    // Simple glob matching for *.ext patterns
    if (pattern.startsWith('*.')) {
      const ext = pattern.slice(1);
      if (fileName.endsWith(ext)) return true;
    }
  }
  return false;
}

function scanFileForHighEntropy(filePath, config) {
  const findings = [];
  const entropyConfig = config.thresholds.entropy;
  const excludePaths = config.excludeEntropyPaths || [];
  
  if (shouldExcludePath(filePath, excludePaths)) {
    return findings;
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const potentialSecrets = extractPotentialSecrets(line);
      
      for (const secret of potentialSecrets) {
        if (secret.value.length >= entropyConfig.minLength) {
          const entropy = calculateEntropy(secret.value);
          
          if (entropy >= entropyConfig.threshold) {
            findings.push({
              line: index + 1,
              entropy: entropy.toFixed(2),
              preview: secret.value.substring(0, 10) + '...'
            });
          }
        }
      }
    });
  } catch (error) {
    // Skip unreadable files
  }
  
  return findings;
}

function main() {
  const config = loadConfig();
  
  if (!config.thresholds.entropy.enabled) {
    process.exit(0);
  }
  
  const files = process.argv.slice(2);
  
  if (files.length === 0) {
    process.exit(0);
  }
  
  let hasViolations = false;
  
  for (const file of files) {
    const findings = scanFileForHighEntropy(file, config);
    
    if (findings.length > 0) {
      hasViolations = true;
      console.error('\n' + String.fromCharCode(9888) + '  WARNING: High-entropy string detected in ' + file);
      findings.forEach(finding => {
        console.error('   Line ' + finding.line + ': entropy=' + finding.entropy + ' "' + finding.preview + '"');
      });
    }
  }
  
  if (hasViolations) {
    console.error('\n' + String.fromCharCode(128274) + ' High-entropy strings may indicate leaked secrets.');
    console.error('   Review these strings carefully before committing.\n');
    process.exit(1);
  }
  
  process.exit(0);
}

module.exports = { calculateEntropy, scanFileForHighEntropy };

if (require.main === module) {
  main();
}
