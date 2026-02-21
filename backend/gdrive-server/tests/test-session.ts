/**
 * Test Redis Session Operations
 *
 * This script tests the SessionManager CRUD operations against Redis.
 *
 * Usage:
 *   npx tsx tests/test-session.ts
 */

import { sessionManager } from '../src/session/index.js';
import { initializeRedis, closeRedis } from '../src/session/redis-client.js';

async function testSessionOperations() {
  console.log('🔧 Initializing Redis connection...');
  initializeRedis({ host: 'localhost', port: 6379 });

  console.log('\n✅ Test 1: Create Session');
  const session = await sessionManager.createSession({
    metadata: {
      userAgent: 'test-script/1.0',
      ipAddress: '127.0.0.1',
    },
  });
  console.log(`   Session created: ${session.id}`);
  console.log(`   Expires at: ${new Date(session.expiresAt).toISOString()}`);
  console.log(`   Authenticated: ${session.authenticated}`);

  console.log('\n✅ Test 2: Get Session');
  const retrieved = await sessionManager.getSession(session.id);
  if (retrieved) {
    console.log(`   Session retrieved: ${retrieved.id}`);
    console.log(`   Last accessed: ${new Date(retrieved.lastAccessedAt).toISOString()}`);
  } else {
    console.log('   ❌ Session not found!');
  }

  console.log('\n✅ Test 3: Update Session');
  const updated = await sessionManager.updateSession(session.id, {
    metadata: {
      ...session.metadata,
      testFlag: true,
    },
  });
  if (updated) {
    console.log(`   Session updated: ${updated.id}`);
    console.log(`   Metadata: ${JSON.stringify(updated.metadata)}`);
  } else {
    console.log('   ❌ Session update failed!');
  }

  console.log('\n✅ Test 4: Store OAuth Tokens');
  const withTokens = await sessionManager.storeTokens(
    session.id,
    {
      access_token: 'ya29.test_access_token',
      refresh_token: 'test_refresh_token',
      scope: 'https://www.googleapis.com/auth/drive',
      token_type: 'Bearer',
      expiry_date: Date.now() + 3600 * 1000,
    },
    'test@example.com'
  );
  if (withTokens) {
    console.log(`   Tokens stored for: ${withTokens.userEmail}`);
    console.log(`   Authenticated: ${withTokens.authenticated}`);
    console.log(`   Has access token: ${!!withTokens.tokens?.access_token}`);
  } else {
    console.log('   ❌ Token storage failed!');
  }

  console.log('\n✅ Test 5: Get Session Count');
  const count = await sessionManager.getSessionCount();
  console.log(`   Active sessions: ${count}`);

  console.log('\n✅ Test 6: Refresh Session');
  const refreshed = await sessionManager.refreshSession(session.id);
  if (refreshed) {
    console.log(`   Session refreshed: ${refreshed.id}`);
    console.log(`   New expiry: ${new Date(refreshed.expiresAt).toISOString()}`);
  } else {
    console.log('   ❌ Session refresh failed!');
  }

  console.log('\n✅ Test 7: Get All Sessions');
  const allSessions = await sessionManager.getAllSessions();
  console.log(`   Total sessions: ${allSessions.length}`);
  allSessions.forEach((s, i) => {
    console.log(`   ${i + 1}. ${s.id} (${s.authenticated ? 'authenticated' : 'unauthenticated'})`);
  });

  console.log('\n✅ Test 8: Delete Session');
  const deleted = await sessionManager.deleteSession(session.id);
  console.log(`   Session deleted: ${deleted}`);

  console.log('\n✅ Test 9: Verify Deletion');
  const shouldBeNull = await sessionManager.getSession(session.id);
  console.log(`   Session exists: ${shouldBeNull !== null ? '❌ FAIL' : '✅ PASS'}`);

  console.log('\n✅ Test 10: Cleanup Expired Sessions');
  const cleanedCount = await sessionManager.cleanupExpiredSessions();
  console.log(`   Cleaned up ${cleanedCount} expired sessions`);

  console.log('\n🎉 All tests completed successfully!');

  await closeRedis();
  process.exit(0);
}

testSessionOperations().catch((error) => {
  console.error('\n❌ Test failed:', error);
  closeRedis().then(() => process.exit(1));
});
