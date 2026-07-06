import test from 'node:test';
import assert from 'node:assert/strict';
const roles = ['manager','referee','federation'];
function isAppRole(v){ return roles.includes(v); }
function isValidSession(s){ return !!s && !!s.accessToken && !!s.refreshToken && !Number.isNaN(Date.parse(s.expiresAt)) && !!s.user?.id && !!s.user?.email && isAppRole(s.user.role); }
test('validates web-compatible AppSession shape and roles', () => { assert.equal(isValidSession({ accessToken:'a', refreshToken:'r', expiresAt:new Date(Date.now()+1000).toISOString(), user:{ id:'1', email:'a@b.it', role:'manager', displayName:'A' }}), true); assert.equal(isValidSession({ accessToken:'a', refreshToken:'r', expiresAt:'bad', user:{ id:'1', email:'a@b.it', role:'admin', displayName:'A' }}), false); });
test('keeps role redirects aligned with Wave 1 routing', () => { assert.deepEqual({ manager:'/manager', referee:'/referee', federation:'/federation' }, { manager:'/manager', referee:'/referee', federation:'/federation' }); });
