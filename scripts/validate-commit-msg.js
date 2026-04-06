#!/usr/bin/env node
/**
 * Conventional Commits Format Validator
 * Validates commit messages follow the conventional commits specification
 * 
 * Format: ^(feat|fix|docs|chore|security|test|refactor|ci)(\(.+\))?: .{1,100}$
 */

const fs = require('fs');

const COMMIT_MSG_REGEX = /^(feat|fix|docs|chore|security|test|refactor|ci)(\(.+\))?: .{1,100}$/;

const VALID_TYPES = ['feat', 'fix', 'docs', 'chore', 'security', 'test', 'refactor', 'ci'];

function validateCommitMessage(message) {
  // Strip trailing newlines
  const firstLine = message.split('\n')[0].trim();
  
  // Skip merge commits
  if (firstLine.startsWith('Merge ')) {
    return { valid: true };
  }
  
  // Skip revert commits
  if (firstLine.startsWith('Revert ')) {
    return { valid: true };
  }
  
  // Check basic format
  if (!COMMIT_MSG_REGEX.test(firstLine)) {
    return {
      valid: false,
      message: firstLine,
      reason: 'Message does not match conventional commits format'
    };
  }
  
  // Extract type
  const typeMatch = firstLine.match(/^([a-z]+)/);
  if (typeMatch && !VALID_TYPES.includes(typeMatch[1])) {
    return {
      valid: false,
      message: firstLine,
      reason: 'Invalid type: ' + typeMatch[1] + '. Valid types: ' + VALID_TYPES.join(', ')
    };
  }
  
  // Check description length (after the colon and space)
  const colonIndex = firstLine.indexOf(':');
  if (colonIndex !== -1) {
    const description = firstLine.slice(colonIndex + 1).trim();
    if (description.length === 0) {
      return {
        valid: false,
        message: firstLine,
        reason: 'Description is required after the colon'
      };
    }
    if (description.length > 100) {
      return {
        valid: false,
        message: firstLine,
        reason: 'Description exceeds 100 characters (' + description.length + ' chars)'
      };
    }
  }
  
  return { valid: true };
}

function main() {
  // Commit message file path is passed as argument
  const commitMsgFile = process.argv[2];
  
  if (!commitMsgFile) {
    console.error('Usage: validate-commit-msg.js <commit-message-file>');
    process.exit(1);
  }
  
  try {
    const message = fs.readFileSync(commitMsgFile, 'utf8');
    const result = validateCommitMessage(message);
    
    if (!result.valid) {
      console.error('\n' + String.fromCharCode(10060) + ' BLOCKED: Invalid commit message format');
      console.error('   Message: "' + result.message + '"');
      console.error('   Reason: ' + result.reason);
      console.error('\n   Expected format: <type>(<scope>): <description>');
      console.error('   Valid types: ' + VALID_TYPES.join(', '));
      console.error('   Example: feat(auth): add user login flow\n');
      process.exit(1);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error reading commit message:', error.message);
    process.exit(1);
  }
}

module.exports = { validateCommitMessage, VALID_TYPES };

if (require.main === module) {
  main();
}
