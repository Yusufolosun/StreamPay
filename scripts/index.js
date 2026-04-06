/**
 * StreamPay Pre-commit Security Hooks
 * 
 * This module exports all security scanning functions for use
 * in the pre-commit hook pipeline.
 * 
 * @module scripts/index
 */

module.exports = {
  // Secret scanners
  scanPrivateKeys: require('./scan-private-keys'),
  scanBip39Mnemonic: require('./scan-bip39-mnemonic'),
  scanNpmTokens: require('./scan-npm-tokens'),
  scanHiroKeys: require('./scan-hiro-keys'),
  scanEntropy: require('./scan-entropy'),
  scanSecrets: require('./scan-secrets'),
  
  // Guards
  guardEnvFiles: require('./guard-env-files'),
  guardMainnetToml: require('./guard-mainnet-toml'),
  guardLargeFiles: require('./guard-large-files'),
  
  // Validators
  validateCommitMsg: require('./validate-commit-msg')
};
