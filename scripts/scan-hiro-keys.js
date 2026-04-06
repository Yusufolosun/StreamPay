#!/usr/bin/env node
/**
 * Hiro API Key Scanner
 * Detects Hiro/Stacks API keys in staged files
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

// Hiro/Stacks API key patterns
const HIRO_API_PATTERNS = [
  /HIRO_API_KEY\s*[=:]\s*['""]?[A-Za-z0-9_-]{20,}/i,
  /STACKS_API_KEY\s*[=:]\s*['""]?[A-Za-z0-9_-]{20,}/i,
  /X-API-KEY\s*[=:]\s*['""]?[A-Za-z0-9_-]{20,}/i,
  /x-hiro-api-key\s*[=:]\s*['""]?[A-Za-z0-9_-]{20,}/i,
  /['"""]x-hiro-api-key['""]:\s*['""][A-Za-z0-9_-]{20,}['""]/, // JSON format
  /Authorization:\s*Bearer\s+[A-Za-z0-9_-]{20,}/i
];

function scanFileForHiroKeys(filePath) {
  const findings = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      for (const pattern of HIRO_API_PATTERNS) {
        if (pattern.test(line)) {
          // Mask the actual key value
          const maskedLine = line.replace(/([=:]\s*['""]?)([A-Za-z0-9_-]{20,})/, '\[REDACTED]');
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
  
  if (!config.patterns.hiroApiKey.enabled) {
    process.exit(0);
  }
  
  const files = process.argv.slice(2);
  
  if (files.length === 0) {
    process.exit(0);
  }
  
  let hasViolations = false;
  
  for (const file of files) {
    const findings = scanFileForHiroKeys(file);
    
    if (findings.length > 0) {
      hasViolations = true;
      console.error('\n' + String.fromCharCode(10060) + ' BLOCKED: Hiro/Stacks API key detected in ' + file);
      findings.forEach(finding => {
        console.error('   Line ' + finding.line + ': ' + finding.match);
      });
    }
  }
  
  if (hasViolations) {
    console.error('\n' + String.fromCharCode(128274) + ' API keys must not be committed.');
    console.error('   Use environment variables for API keys.\n');
    process.exit(1);
  }
  
  process.exit(0);
}

module.exports = { scanFileForHiroKeys };

if (require.main === module) {
  main();
}
