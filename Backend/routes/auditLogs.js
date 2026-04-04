const express = require('express');
let router = express.Router();
let { CheckLogin, CheckRole } = require('../utils/authHandler');
let auditLogModel = require('../schemas/auditLogs');
let mongoose = require('mongoose');

const adminGuard = [CheckLogin, CheckRole(['Admin'])];

/**
 * GET / — Retrieve audit logs with filters (admin only)
 * Query params:
 *   - action: Filter by action type
 *   - admin: Filter by admin user ID
 *   - resourceType: Filter by resource type (product, order, inventory, etc.)
 *   - resourceId: Filter by resource ID
 *   - status: Filter by success/failed
 *   - startDate: Filter by date range (ISO string)
 *   - endDate: Filter by date range (ISO string)
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 20)
 */
router.get('/', adminGuard, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      action,
      admin,
      resourceType,
      resourceId,
      status,
      startDate,
      endDate
    } = req.query;

    const normalizedPage = Math.max(1, Number.parseInt(page, 10) || 1);
    const normalizedLimit = Math.max(1, Math.min(100, Number.parseInt(limit, 10) || 20));

    // Build filter object
    const filter = {};

    if (action) {
      filter.action = action;
    }

    if (admin && mongoose.isValidObjectId(admin)) {
      filter.admin = admin;
    }

    if (resourceType) {
      filter['resource.type'] = resourceType;
    }

    if (resourceId && mongoose.isValidObjectId(resourceId)) {
      filter['resource.id'] = resourceId;
    }

    if (status && ['success', 'failed'].includes(status)) {
      filter.status = status;
    }

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        try {
          filter.createdAt.$gte = new Date(startDate);
        } catch (e) {
          // Invalid date format, skip this filter
        }
      }
      if (endDate) {
        try {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          filter.createdAt.$lte = end;
        } catch (e) {
          // Invalid date format, skip this filter
        }
      }
    }

    // Execute query
    const total = await auditLogModel.countDocuments(filter);

    const logs = await auditLogModel.find(filter)
      .populate({
        path: 'admin',
        select: 'username email fullName'
      })
      .sort({ createdAt: -1 })
      .skip((normalizedPage - 1) * normalizedLimit)
      .limit(normalizedLimit)
      .lean();

    res.send({
      logs,
      total,
      page: normalizedPage,
      totalPages: Math.ceil(total / normalizedLimit),
      limit: normalizedLimit
    });
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

/**
 * GET /stats — Get audit statistics for dashboard (admin only)
 * Returns count of actions by type and trends
 */
router.get('/stats', adminGuard, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);

    // Actions today
    const actionsToday = await auditLogModel.countDocuments({
      createdAt: { $gte: today }
    });

    // Actions last 7 days
    const actionsLast7Days = await auditLogModel.countDocuments({
      createdAt: { $gte: last7Days }
    });

    // Failed actions today
    const failedActionsToday = await auditLogModel.countDocuments({
      createdAt: { $gte: today },
      status: 'failed'
    });

    // Action breakdown
    const actionBreakdown = await auditLogModel.aggregate([
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
          failedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Top admins by actions
    const topAdmins = await auditLogModel.aggregate([
      {
        $group: {
          _id: '$admin',
          actionCount: { $sum: 1 }
        }
      },
      { $sort: { actionCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'adminInfo'
        }
      }
    ]);

    res.send({
      actionsToday,
      actionsLast7Days,
      failedActionsToday,
      actionBreakdown,
      topAdmins
    });
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

/**
 * GET /:id — Get detailed audit log entry (admin only)
 */
router.get('/:id', adminGuard, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).send({ message: 'ID không hợp lệ' });
    }

    const log = await auditLogModel.findById(req.params.id)
      .populate({
        path: 'admin',
        select: 'username email fullName'
      });

    if (!log) {
      return res.status(404).send({ message: 'Audit log không tồn tại' });
    }

    res.send(log);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

/**
 * GET /resource/:resourceType/:resourceId — Get all audit logs for a specific resource (admin only)
 */
router.get('/resource/:resourceType/:resourceId', adminGuard, async (req, res) => {
  try {
    const { resourceType, resourceId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!mongoose.isValidObjectId(resourceId)) {
      return res.status(400).send({ message: 'Resource ID không hợp lệ' });
    }

    const normalizedPage = Math.max(1, Number.parseInt(page, 10) || 1);
    const normalizedLimit = Math.max(1, Math.min(100, Number.parseInt(limit, 10) || 20));

    const filter = {
      'resource.type': resourceType,
      'resource.id': resourceId
    };

    const total = await auditLogModel.countDocuments(filter);

    const logs = await auditLogModel.find(filter)
      .populate({
        path: 'admin',
        select: 'username email fullName'
      })
      .sort({ createdAt: -1 })
      .skip((normalizedPage - 1) * normalizedLimit)
      .limit(normalizedLimit)
      .lean();

    res.send({
      logs,
      total,
      page: normalizedPage,
      totalPages: Math.ceil(total / normalizedLimit),
      limit: normalizedLimit
    });
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

module.exports = router;
