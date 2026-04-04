const test = require('node:test');
const assert = require('node:assert/strict');

const productMediaRouter = require('../routes/productMedia');

const {
  buildProductMediaAuditEntry,
  PRODUCT_MEDIA_AUDIT_MAP,
} = productMediaRouter._testables;

function createBasePayload(operation) {
  return {
    operation,
    adminId: '65a1b2c3d4e5f67890123456',
    resourceId: '65a1b2c3d4e5f67890123457',
    before: { value: 'before' },
    after: { value: 'after' },
    description: `Testing ${operation}`,
    ipAddress: '127.0.0.1',
  };
}

test('buildProductMediaAuditEntry upload success payload', () => {
  const payload = buildProductMediaAuditEntry(createBasePayload('upload'));

  assert.equal(payload.action, PRODUCT_MEDIA_AUDIT_MAP.upload.action);
  assert.equal(payload.resourceType, PRODUCT_MEDIA_AUDIT_MAP.upload.resourceType);
  assert.equal(payload.success, true);
  assert.equal(payload.errorMessage, '');
});

test('buildProductMediaAuditEntry upload failure payload', () => {
  const payload = buildProductMediaAuditEntry({
    ...createBasePayload('upload'),
    success: false,
    errorMessage: 'upload failed',
  });

  assert.equal(payload.action, PRODUCT_MEDIA_AUDIT_MAP.upload.action);
  assert.equal(payload.success, false);
  assert.equal(payload.errorMessage, 'upload failed');
});

test('buildProductMediaAuditEntry update success payload', () => {
  const payload = buildProductMediaAuditEntry(createBasePayload('update'));

  assert.equal(payload.action, PRODUCT_MEDIA_AUDIT_MAP.update.action);
  assert.equal(payload.resourceType, PRODUCT_MEDIA_AUDIT_MAP.update.resourceType);
  assert.equal(payload.success, true);
});

test('buildProductMediaAuditEntry update failure payload', () => {
  const payload = buildProductMediaAuditEntry({
    ...createBasePayload('update'),
    success: false,
    errorMessage: 'update failed',
  });

  assert.equal(payload.action, PRODUCT_MEDIA_AUDIT_MAP.update.action);
  assert.equal(payload.success, false);
  assert.equal(payload.errorMessage, 'update failed');
});

test('buildProductMediaAuditEntry delete success payload', () => {
  const payload = buildProductMediaAuditEntry(createBasePayload('delete'));

  assert.equal(payload.action, PRODUCT_MEDIA_AUDIT_MAP.delete.action);
  assert.equal(payload.resourceType, PRODUCT_MEDIA_AUDIT_MAP.delete.resourceType);
  assert.equal(payload.success, true);
});

test('buildProductMediaAuditEntry delete failure payload', () => {
  const payload = buildProductMediaAuditEntry({
    ...createBasePayload('delete'),
    success: false,
    errorMessage: 'delete failed',
  });

  assert.equal(payload.action, PRODUCT_MEDIA_AUDIT_MAP.delete.action);
  assert.equal(payload.success, false);
  assert.equal(payload.errorMessage, 'delete failed');
});

test('buildProductMediaAuditEntry reorder success payload', () => {
  const payload = buildProductMediaAuditEntry(createBasePayload('reorder'));

  assert.equal(payload.action, PRODUCT_MEDIA_AUDIT_MAP.reorder.action);
  assert.equal(payload.resourceType, PRODUCT_MEDIA_AUDIT_MAP.reorder.resourceType);
  assert.equal(payload.success, true);
});

test('buildProductMediaAuditEntry reorder failure payload', () => {
  const payload = buildProductMediaAuditEntry({
    ...createBasePayload('reorder'),
    success: false,
    errorMessage: 'reorder failed',
  });

  assert.equal(payload.action, PRODUCT_MEDIA_AUDIT_MAP.reorder.action);
  assert.equal(payload.success, false);
  assert.equal(payload.errorMessage, 'reorder failed');
});

test('buildProductMediaAuditEntry throws when operation unsupported', () => {
  assert.throws(
    () => buildProductMediaAuditEntry(createBasePayload('unsupported')),
    /Unsupported media audit operation/
  );
});
