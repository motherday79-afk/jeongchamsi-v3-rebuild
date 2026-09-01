import test from 'node:test';
import assert from 'node:assert/strict';
import { issueSessionToken, readSessionToken } from '../lib/session.js';

test('signed session token roundtrips and rejects tampering',()=>{
  const secret='a'.repeat(32);
  const token=issueSessionToken('admin01',secret,1700000000000);
  assert.equal(readSessionToken(token,secret,1700000001000)?.userId,'admin01');
  assert.equal(readSessionToken(token+'x',secret,1700000001000),null);
});
