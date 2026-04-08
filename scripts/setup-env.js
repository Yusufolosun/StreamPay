#!/usr/bin/env node

/**
 * StreamPay - Environment Setup Script
 *
 * Copies all .env.example files to .env.local and guides the user
 * through setting up their development environment.
 *
 * Run with: npm run setup:env
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ANSI color codes
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

// Environment file mappings
const ENV_FILES = [
  { source: 'apps/web/.env.example', target: 'apps/web/.env.local' },
  { source: 'apps/api/.env.example', target: 'apps/api/.env.local' },
  { source: 'contracts/.env.example', target: 'contracts/.env.local' },
  { source: 'packages/sdk/.env.example', target: 'packages/sdk/.env.local' },
];

function copyEnvFile(source, target) {
  const sourcePath = path.join(process.cwd(), source);
  const targetPath = path.join(process.cwd(), target);

  if (!fs.existsSync(sourcePath)) {
    console.log(`${RED}✗${RESET} Source not found: ${source}`);
    return false;
  }

  if (fs.existsSync(targetPath)) {
    console.log(`${YELLOW}⚠${RESET} Already exists: ${target} (skipped)`);
    return false;
  }

  fs.copyFileSync(sourcePath, targetPath);
  console.log(`${GREEN}✓${RESET} Created: ${target}`);
  return true;
}

async function main() {
  console.log(`
${BOLD}╔══════════════════════════════════════════════════════════════╗
║            StreamPay Environment Setup                       ║
╚══════════════════════════════════════════════════════════════╝${RESET}
`);

  console.log('Creating .env.local files from templates...\n');

  let createdCount = 0;
  ENV_FILES.forEach(({ source, target }) => {
    if (copyEnvFile(source, target)) {
      createdCount++;
    }
  });

  console.log(`
${BOLD}Next Steps:${RESET}
`);

  if (createdCount > 0) {
    console.log(`${CYAN}1.${RESET} Edit each .env.local file and fill in your values:
   - apps/web/.env.local      (frontend config)
   - apps/api/.env.local      (backend secrets)
   - contracts/.env.local     (Clarinet deployer - ${RED}NEVER use mainnet mnemonic!${RESET})
   - packages/sdk/.env.local  (SDK testing)
`);

    console.log(`${CYAN}2.${RESET} For local development (devnet), you can use Clarinet's default values.
   Run: ${BOLD}cd contracts && clarinet devnet start${RESET}
`);

    console.log(`${CYAN}3.${RESET} For testnet, get an API key from: ${BOLD}https://platform.hiro.so${RESET}
   And fund your wallet from the faucet: ${BOLD}https://explorer.hiro.so/sandbox/faucet${RESET}
`);
  } else {
    console.log(`${GREEN}All .env.local files already exist.${RESET}
   Edit them directly to update your configuration.
`);
  }

  console.log(`${YELLOW}⚠ Security Reminder:${RESET}
   - .env.local files are gitignored and safe for secrets
   - NEVER commit .env.local or share your DEPLOYER_MNEMONIC
   - See ENV_ARCHITECTURE.md for full documentation
`);
}

main().catch(console.error);
