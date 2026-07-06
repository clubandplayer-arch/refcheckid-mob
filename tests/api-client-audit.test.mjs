import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const apiClient = readFileSync(new URL('../src/api/client.ts', import.meta.url), 'utf8');
const handover = readFileSync(new URL('../docs/HANDOVER/Mobile_Handover_Package.md', import.meta.url), 'utf8');

test('api client keeps handover generic non-OK error message', () => {
  assert.match(handover, /API request failed with status <status>/);
  assert.match(apiClient, /API request failed with status \$\{response\.status\}/);
});

test('api client refreshes expired sessions before request and clears session on refresh failure', () => {
  assert.match(apiClient, /isExpired\(session\)/);
  assert.match(apiClient, /refreshSession\(session\.refreshToken\)/);
  assert.match(apiClient, /clearSession\(\)/);
});

test('api client does not implement undocumented retry-on-401 behavior', () => {
  assert.doesNotMatch(apiClient, /response\.status\s*={2,3}\s*401/);
});
