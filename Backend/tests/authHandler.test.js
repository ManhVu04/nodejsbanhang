const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeRequiredRoles, hasRequiredRole } = require('../utils/authHandler');

test('normalizeRequiredRoles normalizes array values to lowercase', () => {
    const roles = normalizeRequiredRoles(['Admin', 'Moderator']);
    assert.deepEqual(roles, ['admin', 'moderator']);
});

test('normalizeRequiredRoles supports rest arguments', () => {
    const roles = normalizeRequiredRoles('ADMIN', 'user');
    assert.deepEqual(roles, ['admin', 'user']);
});

test('hasRequiredRole returns true when user role is allowed', () => {
    const user = { role: { name: 'Admin' } };
    assert.equal(hasRequiredRole(user, ['admin']), true);
});

test('hasRequiredRole returns false for missing role', () => {
    const user = { role: { name: 'Customer' } };
    assert.equal(hasRequiredRole(user, ['admin', 'moderator']), false);
    assert.equal(hasRequiredRole(null, ['admin']), false);
});
