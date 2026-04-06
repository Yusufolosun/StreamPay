#!/usr/bin/env node
/**
 * Large File Guard
 * Blocks files larger than configured threshold (default 500KB)
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

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function main() {
  const config = loadConfig();
  const maxSize = config.thresholds.largeFile.maxSizeBytes || 512000;
  const files = process.argv.slice(2);
  
  if (files.length === 0) {
    process.exit(0);
  }
  
  let hasViolations = false;
  
  for (const file of files) {
    try {
      const stats = fs.statSync(file);
      
      if (stats.size > maxSize) {
        hasViolations = true;
        console.error('\n' + String.fromCharCode(10060) + ' BLOCKED: File exceeds size limit (' + formatBytes(maxSize) + ')');
        console.error('   File: ' + file);
        console.error('   Size: ' + formatBytes(stats.size));
      }
    } catch (error) {
      // Skip files that can't be stat'd
    }
  }
  
  if (hasViolations) {
    console.error('\n' + String.fromCharCode(128274) + ' Large files should not be committed to the repository.');
    console.error('   Use Git LFS for large binary files or reduce file size.\n');
    process.exit(1);
  }
  
  process.exit(0);
}

module.exports = { formatBytes };

if (require.main === module) {
  main();
}
