/**
 * Test script for token encryption functionality
 *
 * This script verifies that:
 * 1. Encryption/decryption works correctly
 * 2. Each encryption produces different output (random IV)
 * 3. Decrypted data matches original data
 * 4. OAuth token encryption/decryption preserves all fields
 */

import { encryptTokens, decryptTokens, encrypt, decrypt } from './dist/utils/encryption.js';

console.log('Starting encryption tests...\n');

// Test 1: Basic encryption/decryption
console.log('Test 1: Basic encryption/decryption');
const testData = 'Hello, World! This is sensitive data.';
const encrypted = encrypt(testData);
const decrypted = decrypt(encrypted);

console.log(`  Original: ${testData}`);
console.log(`  Encrypted (base64): ${encrypted.substring(0, 50)}...`);
console.log(`  Decrypted: ${decrypted}`);
console.log(`  ✓ Match: ${testData === decrypted ? 'PASS' : 'FAIL'}\n`);

// Test 2: Unique encryption (different IV each time)
console.log('Test 2: Unique encryption with random IV');
const encrypted1 = encrypt(testData);
const encrypted2 = encrypt(testData);
console.log(`  Same input produces different ciphertext: ${encrypted1 !== encrypted2 ? 'PASS' : 'FAIL'}`);
console.log(`  Both decrypt to original: ${decrypt(encrypted1) === testData && decrypt(encrypted2) === testData ? 'PASS' : 'FAIL'}\n`);

// Test 3: OAuth token encryption/decryption
console.log('Test 3: OAuth token encryption/decryption');
const testTokens = {
  access_token: 'ya29.a0AfH6SMBx...',
  refresh_token: '1//0gABC123XYZ...',
  scope: 'https://www.googleapis.com/auth/forms.body.readonly',
  token_type: 'Bearer',
  expiry_date: 1640995200000
};

const encryptedTokens = encryptTokens(testTokens);
const decryptedTokens = decryptTokens(encryptedTokens);

console.log('  Original tokens:');
console.log(`    access_token: ${testTokens.access_token}`);
console.log(`    refresh_token: ${testTokens.refresh_token}`);
console.log(`    scope: ${testTokens.scope}`);
console.log(`    token_type: ${testTokens.token_type}`);
console.log(`    expiry_date: ${testTokens.expiry_date}`);

console.log('  Encrypted (base64):', encryptedTokens.substring(0, 50) + '...');

console.log('  Decrypted tokens:');
console.log(`    access_token: ${decryptedTokens.access_token}`);
console.log(`    refresh_token: ${decryptedTokens.refresh_token}`);
console.log(`    scope: ${decryptedTokens.scope}`);
console.log(`    token_type: ${decryptedTokens.token_type}`);
console.log(`    expiry_date: ${decryptedTokens.expiry_date}`);

const tokensMatch =
  testTokens.access_token === decryptedTokens.access_token &&
  testTokens.refresh_token === decryptedTokens.refresh_token &&
  testTokens.scope === decryptedTokens.scope &&
  testTokens.token_type === decryptedTokens.token_type &&
  testTokens.expiry_date === decryptedTokens.expiry_date;

console.log(`  ✓ All fields match: ${tokensMatch ? 'PASS' : 'FAIL'}\n`);

// Test 4: Error handling - invalid ciphertext
console.log('Test 4: Error handling');
try {
  decrypt('invalid-base64-data-that-will-fail');
  console.log('  ✗ Should have thrown error: FAIL\n');
} catch (error) {
  console.log(`  ✓ Correctly throws error on invalid data: PASS`);
  console.log(`  Error message: ${error.message}\n`);
}

console.log('All tests completed!');
