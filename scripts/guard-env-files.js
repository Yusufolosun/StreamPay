#!/usr/bin/env node
/**
 * .env File Guard
 * Blocks staging of .env files except .env.example and .env.template
 */

const path = require('path');

const ALLOWED_ENV_FILES = ['.env.example', '.env.template'];

function main() {
  const files = process.argv.slice(2);
  
  if (files.length === 0) {
    process.exit(0);
  }
  
  let hasViolations = false;
  
  for (const file of files) {
    const fileName = path.basename(file);
    
    // Check if file starts with .env
    if (fileName.startsWith('.env')) {
      // Check if it's an allowed file
      if (!ALLOWED_ENV_FILES.includes(fileName)) {
        hasViolations = true;
        console.error('\n' + String.fromCharCode(10060) + ' BLOCKED: .env files must not be committed. Use .env.example.');
        console.error('   File: ' + file);
      }
    }
  }
  
  if (hasViolations) {
    console.error('\n' + String.fromCharCode(128274) + ' Environment files contain secrets and must not be committed.');
    console.error('   Allowed files: .env.example, .env.template\n');
    process.exit(1);
  }
  
  process.exit(0);
}

module.exports = { ALLOWED_ENV_FILES };

if (require.main === module) {
  main();
}
