const auditLogModel = require('../schemas/auditLogs');

/**
 * Log admin action to audit trail
 * @param {Object} params - Audit log parameters
 * @param {string} params.action - Action type (e.g., 'PRODUCT_UPDATE_PRICE')
 * @param {string} params.adminId - Admin user ID
 * @param {string} params.resourceType - Type of resource affected (e.g., 'product', 'order')
 * @param {string} params.resourceId - ID of the affected resource
 * @param {Object} params.before - Previous state of resource
 * @param {Object} params.after - New state of resource (or changes only)
 * @param {string} params.description - Human-readable description of the action
 * @param {string} params.ipAddress - IP address of the admin
 * @param {boolean} params.success - Whether action succeeded (default: true)
 * @param {string} params.errorMessage - Error message if failed
 * @returns {Promise<Object>} - Created audit log document
 */
async function logAuditAction(params) {
  try {
    const {
      action,
      adminId,
      resourceType,
      resourceId,
      before = null,
      after = null,
      description = '',
      ipAddress = '',
      success = true,
      errorMessage = ''
    } = params;

    // Validate required parameters
    if (!action || !adminId || !resourceType || !resourceId) {
      console.error('[AuditLog] Missing required parameters:', {
        action,
        adminId,
        resourceType,
        resourceId
      });
      return null;
    }

    const auditLog = new auditLogModel({
      action,
      admin: adminId,
      resource: {
        type: resourceType,
        id: resourceId
      },
      changes: {
        before,
        after
      },
      description,
      ipAddress,
      status: success ? 'success' : 'failed',
      errorMessage: success ? '' : errorMessage
    });

    await auditLog.save();
    console.log(`[AuditLog] Logged: ${action} for ${resourceType}:${resourceId}`);
    return auditLog;
  } catch (error) {
    console.error('[AuditLog] Error logging audit action:', error.message);
    // Don't throw error to prevent audit logging from breaking main operations
    return null;
  }
}

/**
 * Get specific changes between two objects
 * @param {Object} before - Original object
 * @param {Object} after - Updated object
 * @param {Array<string>} fieldsToTrack - Fields to compare (optional, all by default)
 * @returns {Object} - Object containing only changed fields
 */
function getChangesDiff(before, after, fieldsToTrack = null) {
  const changes = {
    before: {},
    after: {}
  };

  const fieldsToCheck = fieldsToTrack || Object.keys(after || {});

  for (const field of fieldsToCheck) {
    const beforeValue = before?.[field];
    const afterValue = after?.[field];

    // Compare values (handle ObjectId comparison)
    const beforeStr = String(beforeValue ?? '');
    const afterStr = String(afterValue ?? '');

    if (beforeStr !== afterStr) {
      changes.before[field] = beforeValue;
      changes.after[field] = afterValue;
    }
  }

  return changes;
}

/**
 * Get admin IP address from request
 * @param {Object} req - Express request object
 * @returns {string} - IP address
 */
function getClientIpAddress(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket.remoteAddress ||
    ''
  );
}

module.exports = {
  logAuditAction,
  getChangesDiff,
  getClientIpAddress
};
