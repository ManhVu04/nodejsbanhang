# Audit Log Feature Documentation

## Overview
The AuditLog feature tracks and logs all admin actions for traceability and compliance. It records who did what, when, and what changed, with detailed before/after information.

## Features
- ✅ Tracks admin operations: product edits (price, info), inventory changes, order updates
- ✅ Captures before/after state changes with detailed diff
- ✅ Records admin user, IP address, timestamp, and action status
- ✅ Supports both successful and failed operations
- ✅ RESTful API for querying audit logs with advanced filtering
- ✅ Admin-only access (requires Admin role)
- ✅ Dashboard statistics endpoint for audit analytics

## Database Schema

### AuditLog Collection (`auditLogs`)
```javascript
{
  action: String,              // e.g., 'PRODUCT_UPDATE_PRICE', 'INVENTORY_UPDATE_STOCK'
  admin: ObjectId,             // Reference to admin user
  resource: {
    type: String,              // 'product', 'order', 'inventory', 'category', etc.
    id: ObjectId               // ID of the affected resource
  },
  changes: {
    before: Object,            // Previous state
    after: Object              // New state/changes only
  },
  description: String,         // Human-readable description
  ipAddress: String,           // Admin's IP address
  status: 'success' | 'failed',
  errorMessage: String,        // Only if failed
  createdAt: Date,             // Timestamp
  updatedAt: Date
}
```

## Supported Actions

### Products
- `PRODUCT_CREATE` - New product created
- `PRODUCT_UPDATE_PRICE` - Price changed
- `PRODUCT_UPDATE_INFO` - Product info changed (title, description, etc.)
- `PRODUCT_DELETE` - Product soft-deleted

### Inventory
- `INVENTORY_UPDATE_STOCK` - Stock quantity changed

### Orders
- `ORDER_UPDATE_STATUS` - Order status changed
- `ORDER_UPDATE_INFO` - Order info changed

### Categories
- `CATEGORY_CREATE` - Category created
- `CATEGORY_UPDATE` - Category updated
- `CATEGORY_DELETE` - Category deleted

## API Endpoints

All endpoints require Admin authentication (JWT token + Admin role)

### 1. Get Audit Logs with Filters
```
GET /api/v1/audit-logs
```

**Query Parameters:**
- `page` (int, default: 1) - Page number
- `limit` (int, default: 20, max: 100) - Items per page
- `action` (string) - Filter by action type
- `admin` (ObjectId) - Filter by admin user ID
- `resourceType` (string) - Filter by resource type (product, order, inventory, etc.)
- `resourceId` (ObjectId) - Filter by resource ID
- `status` (string) - Filter by 'success' or 'failed'
- `startDate` (ISO string) - Filter from date
- `endDate` (ISO string) - Filter to date

**Example Request:**
```bash
# Get all price changes in last 7 days
GET /api/v1/audit-logs?action=PRODUCT_UPDATE_PRICE&startDate=2024-12-26&endDate=2025-01-02

# Get failed operations by specific admin
GET /api/v1/audit-logs?status=failed&admin={adminId}&limit=20
```

**Response:**
```json
{
  "logs": [
    {
      "_id": "...",
      "action": "PRODUCT_UPDATE_PRICE",
      "admin": {
        "_id": "...",
        "username": "admin_user",
        "email": "admin@example.com",
        "fullName": "Admin Name"
      },
      "resource": {
        "type": "product",
        "id": "..."
      },
      "changes": {
        "before": { "price": 100000 },
        "after": { "price": 95000 }
      },
      "description": "Updated product 'Laptop' price from 100000 to 95000",
      "ipAddress": "192.168.1.100",
      "status": "success",
      "errorMessage": "",
      "createdAt": "2025-01-02T10:30:45.123Z"
    }
  ],
  "total": 150,
  "page": 1,
  "totalPages": 8,
  "limit": 20
}
```

### 2. Get Audit Statistics
```
GET /api/v1/audit-logs/stats
```

**Response:**
```json
{
  "actionsToday": 12,
  "actionsLast7Days": 89,
  "failedActionsToday": 1,
  "actionBreakdown": [
    {
      "_id": "PRODUCT_UPDATE_PRICE",
      "count": 45,
      "failedCount": 2
    },
    {
      "_id": "INVENTORY_UPDATE_STOCK",
      "count": 35,
      "failedCount": 0
    }
  ],
  "topAdmins": [
    {
      "_id": "...",
      "actionCount": 23,
      "adminInfo": [{ "username": "admin_user", "email": "admin@example.com" }]
    }
  ]
}
```

### 3. Get Single Audit Log Entry
```
GET /api/v1/audit-logs/:id
```

**Response:** Full audit log document with nested admin info

### 4. Get Audit Logs for Specific Resource
```
GET /api/v1/audit-logs/resource/:resourceType/:resourceId
```

**Example:**
```bash
# Get all changes to a specific product
GET /api/v1/audit-logs/resource/product/60d5ec49c1234567890abcde

# Get all changes to a specific order
GET /api/v1/audit-logs/resource/order/60d5ec49c1234567890abcde
```

**Query Parameters:**
- `page` (int, default: 1)
- `limit` (int, default: 20, max: 100)

## Tracked Routes

### Products Route (`/routes/products.js`)
- **POST** `/api/v1/products` - Create product → `PRODUCT_CREATE`
- **PUT** `/api/v1/products/:id` - Update product → `PRODUCT_UPDATE_PRICE` or `PRODUCT_UPDATE_INFO`
- **DELETE** `/api/v1/products/:id` - Delete product → `PRODUCT_DELETE`

### Inventories Route (`/routes/inventories.js`)
- **POST** `/api/v1/inventories/:productId/stock` - Add stock → `INVENTORY_UPDATE_STOCK`

### Orders Route (`/routes/orders.js`)
- **PUT** `/api/v1/orders/:id/status` - Update order status → `ORDER_UPDATE_STATUS`

### Categories Route (`/routes/categories.js`)
- **POST** `/api/v1/categories` - Create category → `CATEGORY_CREATE`
- **PUT** `/api/v1/categories/:id` - Update category → `CATEGORY_UPDATE`
- **DELETE** `/api/v1/categories/:id` - Delete category → `CATEGORY_DELETE`

## Implementation Details

### Files Created/Modified

1. **Created: `/Backend/schemas/auditLogs.js`**
   - MongoDB schema for audit logs
   - Indexes for efficient querying

2. **Created: `/Backend/utils/auditHandler.js`**
   - Utility functions for logging:
     - `logAuditAction()` - Main logging function
     - `getChangesDiff()` - Calculate before/after changes
     - `getClientIpAddress()` - Extract client IP

3. **Created: `/Backend/routes/auditLogs.js`**
   - RESTful API endpoints for audit log queries

4. **Modified:**
   - `/Backend/routes/products.js` - Added audit logging
   - `/Backend/routes/inventories.js` - Added audit logging
   - `/Backend/routes/orders.js` - Added audit logging
   - `/Backend/routes/categories.js` - Added audit logging
   - `/Backend/app.js` - Registered `/api/v1/audit-logs` route

### Error Handling
- Audit logging failures don't block main operations
- Failed audit logs are still recorded with error details
- All errors are logged to console for debugging

## Usage Examples

### Get All Operations by Specific Admin Today
```bash
GET /api/v1/audit-logs?admin={adminId}&startDate=2025-01-02&endDate=2025-01-02
```

### Track Price Changes
```bash
GET /api/v1/audit-logs?action=PRODUCT_UPDATE_PRICE
```

### Find Failed Operations
```bash
GET /api/v1/audit-logs?status=failed
```

### Get Complete History for a Product
```bash
GET /api/v1/audit-logs/resource/product/{productId}
```

### Dashboard Statistics
```bash
GET /api/v1/audit-logs/stats
```

## Security

- ✅ All endpoints require authentication (CheckLogin)
- ✅ All endpoints require Admin role (CheckRole(['Admin']))
- ✅ IP addresses are recorded for forensic purposes
- ✅ Failed operations are tracked with error messages
- ✅ Soft deletes preserve audit history

## Performance

- Indexed on: `resource.type`, `admin`, `action`, `createdAt`
- Efficient pagination with skip/limit
- Lean queries where possible for better performance
- Date range filtering on indexed timestamps

## Future Enhancements

1. Add export functionality (CSV/Excel)
2. Add real-time alerts for sensitive operations
3. Add batch operations tracking
4. Add retention policies (auto-delete old logs)
5. Add webhook notifications for critical actions
6. Add advanced search/filtering UI in admin panel
7. Add detailed diff visualization for complex objects
8. Add user action replay capabilities

## Testing

### Manual Test Steps

1. **Test Product Price Update**
   ```bash
   PUT /api/v1/products/{productId}
   { "price": 95000 }
   
   # Verify in audit logs:
   GET /api/v1/audit-logs?action=PRODUCT_UPDATE_PRICE
   ```

2. **Test Inventory Stock Change**
   ```bash
   POST /api/v1/inventories/{productId}/stock
   { "quantity": 50, "reason": "Nhập hàng mới" }
   
   # Verify:
   GET /api/v1/audit-logs?action=INVENTORY_UPDATE_STOCK
   ```

3. **Test Order Status Update**
   ```bash
   PUT /api/v1/orders/{orderId}/status
   { "status": "Shipped" }
   
   # Verify:
   GET /api/v1/audit-logs?action=ORDER_UPDATE_STATUS
   ```

4. **Query by Resource**
   ```bash
   GET /api/v1/audit-logs/resource/product/{productId}
   ```

5. **View Statistics**
   ```bash
   GET /api/v1/audit-logs/stats
   ```

## Troubleshooting

### Logs Not Appearing
1. Check admin user ID is correct and has Admin role
2. Check MongoDB connection and audit logs collection exists
3. Check console for audit logging errors
4. Verify date filters are in correct ISO format

### Performance Issues
1. Implement date range limits in UI
2. Increase `limit` parameter gradually to find optimal value
3. Check MongoDB indexes: `db.auditlogs.getIndexes()`
4. Consider archiving old logs to separate collection

### IP Address Not Captured
1. Verify proxy headers in request
2. Check load balancer configuration for X-Forwarded-For header
3. May need to configure trust proxy in Express if behind load balancer
