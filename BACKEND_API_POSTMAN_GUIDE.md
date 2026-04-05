# Backend API Postman Guide

Tai lieu nay tong hop toan bo API backend hien co va huong dan test tung chuc nang bang Postman.

## 1) Thong tin chung

- Base URL local: `http://localhost:3000`
- Base URL production (vi du): `https://your-domain.com`
- API prefix: `/api/v1`

Vi du endpoint day du:

- `{{baseUrl}}/api/v1/auth/login`

## 2) Cau hinh Postman

Tao Environment voi cac bien:

- `baseUrl` = `http://localhost:3000`
- `userToken` = de trong
- `adminToken` = de trong
- `productId`, `categoryId`, `orderId`, `voucherId`, `mediaId`, `addressId` = de trong

### 2.1 Auth trong he thong nay

Backend chap nhan 2 cach xac thuc:

1. Bearer token trong header `Authorization: Bearer <token>`
2. Cookie `LOGIN_NNPTUD_S3`

De test nhanh tren Postman, nen dung Bearer token.

### 2.2 Script luu token (tab Tests)

Dat script nay trong request login user:

```javascript
const token = pm.response.text();
pm.environment.set("userToken", token);
```

Dat script nay trong request login admin:

```javascript
const token = pm.response.text();
pm.environment.set("adminToken", token);
```

## 3) Quy uoc Auth

- `Public`: khong can token
- `User`: can dang nhap (`CheckLogin`)
- `Admin`: can role Admin (`CheckLogin + CheckRole(['Admin'])`)
- `Admin/Moderator`: can role Admin hoac Moderator

## 4) Thu tu test de nghi (End-to-end)

1. Auth: register -> login user -> login admin
2. Category: tao category
3. Product: tao product
4. Inventory: nhap kho cho product
5. Cart: add/modify/decrease/remove
6. Address: tao dia chi giao hang
7. Voucher: tao voucher + validate
8. Order: tao order
9. VNPay (neu dung): create payment url -> callback return/ipn
10. Review/Wishlist/Return/Reservation
11. Dashboard/Audit logs

---

## 5) API chi tiet theo module

## 5.1 Auth (`/api/v1/auth`)

### POST `/register` (Public)
- Body (JSON):
```json
{
  "username": "user01",
  "password": "Password@123",
  "email": "user01@example.com",
  "fullName": "User 01"
}
```
- Mong doi: tao user + gio hang mac dinh.

### POST `/login` (Public)
- Body:
```json
{
  "username": "user01",
  "password": "Password@123"
}
```
- Mong doi: tra ve token (string), co the duoc set cookie.

### GET `/google/config` (Public)
- Mong doi: `{ enabled, clientId }`.

### POST `/google/login` (Public)
- Body:
```json
{
  "credential": "<google-id-token>"
}
```
- Luu y: `credential` la **Google ID token** (JWT), khong phai `clientId`.
- Cach lay nhanh:
  1. Chay backend (`npm start` trong thu muc `Backend`).
  2. Mo `http://localhost:3000/google-login-token-helper.html`.
  3. Bam `Load Google Config` -> dang nhap Google.
  4. Copy gia tri trong o `Credential (ID token)` va dan vao Postman.

### GET `/me` (User)
- Header: `Authorization: Bearer {{userToken}}`

### POST `/logout` (User)

### POST `/changepassword` (User)
- Body:
```json
{
  "oldpassword": "Password@123",
  "newpassword": "Password@456"
}
```

### POST `/forgotpassword` (Public)
- Body:
```json
{ "email": "user01@example.com" }
```

### POST `/resetpassword/:token` (Public)
- Body:
```json
{ "password": "NewPass@123" }
```

### POST `/resetpassword` (Public)
- Body:
```json
{
  "token": "<token>",
  "password": "NewPass@123"
}
```

---

## 5.2 Users (`/api/v1/users`)

### PUT `/me` (User)
- Body co the gui 1 hoac nhieu field:
```json
{
  "fullName": "User Moi",
  "email": "newmail@example.com",
  "avatarUrl": "https://..."
}
```

### GET `/` (Admin/Moderator)

### GET `/:id` (Admin)

### POST `/` (Admin)
- Body:
```json
{
  "username": "staff01",
  "password": "Password@123",
  "email": "staff01@example.com",
  "role": "<roleObjectId>"
}
```

### PUT `/:id` (Admin)
- Body: field can cap nhat (username/email/role/lockTime/...) tuy schema.

### DELETE `/:id` (Admin)
- Mong doi: soft delete (`isDeleted = true`).

---

## 5.3 Roles (`/api/v1/roles`)

### GET `/` (Admin)
### GET `/:id` (Admin)
### POST `/` (Admin)
```json
{
  "name": "Moderator",
  "description": "Moderation role"
}
```
### PUT `/:id` (Admin)
### DELETE `/:id` (Admin)

---

## 5.4 Categories (`/api/v1/categories`)

### GET `/` (Public)
- Query: `name` (optional)

### GET `/:id` (Public)

### GET `/:id/products` (Public)

### POST `/` (Admin)
```json
{
  "name": "Balo",
  "image": "1777777777777-balo.webp"
}
```

### PUT `/:id` (Admin)
```json
{
  "name": "Balo Nam",
  "image": "1777777777777-balo-new.webp"
}
```

### DELETE `/:id` (Admin)

---

## 5.5 Products (`/api/v1/products`)

### GET `/search` (Public)
- Query ho tro:
  - `q`
  - `category`
  - `minPrice`, `maxPrice`
  - `sort` = `price_asc | price_desc | newest`
  - `page`, `limit`

### GET `/` (Public)
- Query: `min`

### GET `/:id/related` (Public)
- Query: `limit` (default 4)

### GET `/:id` (Public)
- Mong doi: co thong tin ton kho (`availableStock`, `stock`) va media.

### POST `/` (Admin)
```json
{
  "title": "Tui deo cheo A",
  "description": "Mo ta",
  "category": "<categoryId>",
  "images": ["1777777777777-a.webp"],
  "price": 299000,
  "sku": "SKU-A-001"
}
```

### PUT `/:id` (Admin)
- Body partial update (title/description/category/images/price/sku).

### DELETE `/:id` (Admin)
- Soft delete product + danh dau media lien quan la deleted.

---

## 5.6 Product Media (`/api/v1/product-media`)

### GET `/:productId` (Public)

### POST `/upload/:productId` (Admin, `form-data`)
- Key:
  - `file` (File, bat buoc)
  - `mediaType` (`image` hoac `video`, optional)
  - `altText` (optional)

### PUT `/:mediaId` (Admin)
```json
{
  "altText": "anh goc nghieng",
  "displayOrder": 1,
  "isDefault": true
}
```

### DELETE `/:mediaId` (Admin)

### PUT `/reorder/:productId` (Admin)
```json
{
  "mediaOrder": [
    { "mediaId": "<mediaId1>", "displayOrder": 0 },
    { "mediaId": "<mediaId2>", "displayOrder": 1 }
  ]
}
```

---

## 5.7 Carts (`/api/v1/carts`)

Tat ca endpoint cart deu can User token.

### GET `/`
### POST `/add`
```json
{ "product": "<productId>" }
```
### POST `/remove`
```json
{ "product": "<productId>" }
```
### POST `/decrease`
```json
{ "product": "<productId>" }
```
### POST `/modify`
```json
{
  "product": "<productId>",
  "quantity": 3
}
```

---

## 5.8 Uploads (`/api/v1/upload`)

### POST `/an_image` (Admin, form-data)
- key: `file`

### POST `/avatar` (User, form-data)
- key: `file`

### GET `/:filename` (Public)

### POST `/multiple_images` (Admin, form-data)
- key: `files` (co the gui nhieu file)

### POST `/excel` (Admin, form-data)
- key: `file` (xlsx)
- Chuc nang: import product + inventory.

### POST `/excel/users` (Admin, form-data)
- key: `file` (xlsx)
- Chuc nang: import user hang loat.

---

## 5.9 Orders (`/api/v1/orders`)

### POST `/` (User)
```json
{
  "paymentMethod": "COD",
  "shippingAddress": "123 duong A, quan B",
  "shippingPhoneNumber": "0869727139",
  "shippingAddressId": "<addressId>",
  "note": "Giao gio hanh chinh",
  "voucherCode": "SALE10"
}
```
Ghi chu:
- `paymentMethod`: `COD` hoac `VNPay`
- Co the gui `shippingAddressId`; neu co thi backend uu tien thong tin dia chi da luu.

### GET `/` (User)
- Query: `page`, `limit`, `status`

### GET `/admin/all` (Admin)
- Query: `page`, `limit`, `status`

### GET `/:id` (User chu don hoac Admin)

### PUT `/:id/status` (Admin)
```json
{ "status": "Shipped" }
```
- Status hop le: `Pending`, `Paid`, `Shipped`, `Delivered`, `Cancelled`.

---

## 5.10 VNPay (`/api/v1/vnpay`)

### POST `/create-payment-url` (User)
```json
{ "orderId": "<orderId>" }
```

### GET `/vnpay-return` (Public)
- Dung cho browser redirect tu VNPay.

### GET `/vnpay-ipn` (Public)
- Dung cho server-to-server callback.

---

## 5.11 Dashboard (`/api/v1/dashboard`)

Tat ca endpoint dashboard deu Admin.

### GET `/summary`
### GET `/revenue`
- Query: `period=day|month`, `startDate`, `endDate`
### GET `/top-products`
- Query: `limit`
### GET `/order-stats`
### GET `/recent-orders`

---

## 5.12 Inventories (`/api/v1/inventories`)

Tat ca endpoint inventory deu Admin.

### GET `/`
- Query: `page`, `limit`, `search`

### POST `/:productId/stock`
```json
{
  "quantity": 50,
  "reason": "Nhap kho dot 1"
}
```

### GET `/logs`
- Query: `page`, `limit`, `type`, `productId`

---

## 5.13 Vouchers (`/api/v1/vouchers`)

### GET `/validate/:code` (Public)
- Query: `subtotal`

### GET `/` (Admin)

### POST `/` (Admin)
```json
{
  "code": "SALE10",
  "description": "Giam 10%",
  "discountType": "PERCENT",
  "discountValue": 10,
  "minOrderValue": 100000,
  "maxDiscount": 50000,
  "usageLimit": 100,
  "perUserLimit": 1,
  "startsAt": "2026-04-01T00:00:00.000Z",
  "expiresAt": "2026-04-30T23:59:59.000Z",
  "isActive": true
}
```

### PUT `/:id` (Admin)

### DELETE `/:id` (Admin)

### GET `/usage/:code` (Admin)

---

## 5.14 Wishlists (`/api/v1/wishlists`)

Tat ca endpoint wishlist deu User.

### GET `/`
### POST `/:productId` (toggle add/remove)
### DELETE `/:productId`

---

## 5.15 Reviews (`/api/v1/reviews`)

### GET `/product/:productId` (Public)
- Query: `page`, `limit`, `rating`

### GET `/product/:productId/me` (User)

### POST `/product/:productId` (User)
```json
{
  "rating": 5,
  "comment": "San pham tot"
}
```

### DELETE `/:id` (User chu review hoac Admin)

---

## 5.16 Returns (`/api/v1/returns`)

### POST `/` (User)
```json
{
  "orderId": "<orderId>",
  "reason": "San pham loi",
  "details": "Mo ta chi tiet",
  "requestedAmount": 200000
}
```

### GET `/my` (User)
- Query: `status`, `orderId`, `page`, `limit`

### GET `/admin/all` (Admin)
- Query: `status`, `page`, `limit`

### PUT `/:id/review` (Admin)
```json
{
  "status": "Approved",
  "adminNote": "Dong y hoan tien",
  "approvedAmount": 200000,
  "refundTransactionId": "REF-123"
}
```
- `status` hop le: `Approved`, `Rejected`, `Refunded`.

---

## 5.17 Reservations (`/api/v1/reservations`)

Tat ca endpoint reservation deu User.

### POST `/reserve`
```json
{
  "items": [
    { "productId": "<productId1>", "quantity": 1 },
    { "productId": "<productId2>", "quantity": 2 }
  ],
  "paymentMethod": "COD",
  "shippingAddress": "123 duong A",
  "note": "giu hang 15 phut",
  "idempotencyKey": "reserve-key-001",
  "ttlMinutes": 15
}
```

### POST `/:id/confirm`
```json
{
  "paymentMethod": "COD",
  "shippingAddress": "123 duong A",
  "note": "xac nhan"
}
```

### POST `/:id/release`

---

## 5.18 Addresses (`/api/v1/addresses`)

Tat ca endpoint address deu User.

### GET `/`

### POST `/`
```json
{
  "label": "Nha rieng",
  "recipientName": "Nguyen Van A",
  "phoneNumber": "0869727139",
  "addressLine": "123 duong A, phuong B, quan C",
  "isDefault": true
}
```

### PUT `/:id`

### POST `/:id/default`

### DELETE `/:id`

---

## 5.19 Audit Logs (`/api/v1/audit-logs`)

Tat ca endpoint audit log deu Admin.

### GET `/`
- Query:
  - `page`, `limit`
  - `action`
  - `admin`
  - `resourceType`, `resourceId`
  - `status` (`success`/`failed`)
  - `startDate`, `endDate`

### GET `/stats`

### GET `/:id`

### GET `/resource/:resourceType/:resourceId`
- Query: `page`, `limit`

---

## 5.20 Root route

### GET `/` (Public)
- Render trang EJS mac dinh.

---

## 6) Test case nhanh theo chuc nang

## 6.1 Auth + Profile

1. Register user moi -> 200
2. Login user -> luu `userToken`
3. GET `/auth/me` voi `userToken` -> 200
4. PUT `/users/me` doi fullName -> 200

## 6.2 Danh muc + San pham + Kho

1. Login admin -> luu `adminToken`
2. POST `/categories` -> luu `categoryId`
3. POST `/products` -> luu `productId`
4. POST `/inventories/:productId/stock` -> 200
5. GET `/products/:id` -> thay `availableStock > 0`

## 6.3 Cart + Order + Voucher

1. User add cart (`/carts/add`)
2. Admin tao voucher (`/vouchers`)
3. User validate voucher (`/vouchers/validate/:code?subtotal=`)
4. User tao address (`/addresses`)
5. User dat order (`/orders`) -> luu `orderId`
6. User xem order (`/orders/:id`)

## 6.4 Product media

1. Admin upload image/video (`/product-media/upload/:productId`)
2. GET `/product-media/:productId` -> co media
3. PUT `/product-media/:mediaId` doi default/order
4. PUT `/product-media/reorder/:productId`
5. DELETE `/product-media/:mediaId`

## 6.5 Return flow

1. User tao yeu cau doi tra (`/returns`)
2. Admin xem danh sach (`/returns/admin/all`)
3. Admin review (`Approved`/`Rejected`/`Refunded`)
4. User xem lai `/returns/my`

## 6.6 Reservation flow

1. User reserve (`/reservations/reserve`)
2. User confirm (`/reservations/:id/confirm`) hoac release (`/reservations/:id/release`)

---

## 7) Loi thuong gap khi test Postman

- `401 ban chua dang nhap`: thieu/het han token.
- `403 ban khong co quyen`: token khong dung role.
- `400 ...`: body/query khong dung format.
- `404`: id khong ton tai.
- `413`: file upload vuot gioi han gateway/app.
- `503`: DB node khong writable (hiem gap, lien quan replica).

---

## 8) Ghi chu cho upload media

- Endpoint media: `/api/v1/product-media/upload/:productId`
- Dung `form-data` key `file`.
- Ho tro image/video theo MIME + extension.
- Neu production co Nginx, can dam bao `client_max_body_size` du lon.

---

Neu ban can, toi co the tao them 1 file Postman Collection JSON day du theo dung thu tu test o muc 4.