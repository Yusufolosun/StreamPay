#!/usr/bin/env node
/**
 * npm Auth Token Scanner
 * Detects npm registry authentication tokens in staged files
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

// npm auth token patterns
const NPM_AUTH_PATTERNS = [
  /\/\/registry\.npmjs\.org\/:_authToken=/,
  /\/\/registry\.npmjs\.org\/:_password=/,
  /\/\/registry\.npmjs\.org\/:username=/,
  /_authToken\s*=\s*['""]?[A-Za-z0-9_-]+/,
  /npm_[A-Za-z0-9]{36}/  // npm token format
];

function scanFileForNpmTokens(filePath) {
  const findings = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      for (const pattern of NPM_AUTH_PATTERNS) {
        if (pattern.test(line)) {
          // Mask the actual token value
          const maskedLine = line.replace(/([=:]\s*['""]?)([A-Za-z0-9_-]{8,})/, '\[REDACTED]');
          findings.push({
            line: index + 1,
            match: maskedLine.trim().substring(0, 60) + (maskedLine.length > 60 ? '...' : '')
          });
          break;
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
  
  if (!config.patterns.npmAuthToken.enabled) {
    process.exit(0);
  }
  
  const files = process.argv.slice(2);
  
  if (files.length === 0) {
    process.exit(0);
  }
  
  let hasViolations = false;
  
  for (const file of files) {
    const findings = scanFileForNpmTokens(file);
    
    if (findings.length > 0) {
      hasViolations = true;
      console.error('\n' + String.fromCharCode(10060) + ' BLOCKED: npm auth token detected in ' + file);
      findings.forEach(finding => {
        console.error('   Line ' + finding.line + ': ' + finding.match);
      });
    }
  }
  
  if (hasViolations) {
    console.error('\n' + String.fromCharCode(128274) + ' npm auth tokens must not be committed.');
    console.error('   Use NPM_TOKEN environment variable instead.\n');
    process.exit(1);
  }
  
  process.exit(0);
}

module.exports = { scanFileForNpmTokens };

if (require.main === module) {
  main();
}
