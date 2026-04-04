# ProductMedia Feature - API Documentation

## Tổng Quan (Overview)

ProductMedia là một hệ thống quản lý media độc lập cho sản phẩm, hỗ trợ nhiều định dạng ảnh và video. Media được tách khỏi bảng Products chính, cho phép quản lý và tối ưu hóa dễ dàng hơn.

### Các Tính Năng Chính

- ✅ Hỗ trợ Ảnh: JPG, PNG, WebP, GIF, JPEG
- ✅ Hỗ trợ Video: MP4, WebM, OGG, MOV
- ✅ Sắp xếp thứ tự hiển thị (displayOrder)
- ✅ Thiết lập ảnh/video mặc định
- ✅ Alt text cho SEO
- ✅ Soft delete (xóa mềm)
- ✅ Audit logging cho mọi thao tác
- ✅ Kiểm soát quyền Admin

---

## Database Schema

### ProductMedia Schema

```javascript
{
  _id: ObjectId,
  product: ObjectId (ref: 'product'),        // Liên kết đến sản phẩm
  mediaType: String ('image' | 'video'),     // Loại media
  fileFormat: String,                        // Định dạng file (jpg, mp4, etc)
  filePath: String,                          // Đường dẫn file trên server
  fileName: String,                          // Tên file gốc
  fileSize: Number,                          // Kích thước file (bytes)
  mimeType: String,                          // MIME type
  altText: String,                           // Alt text cho SEO
  displayOrder: Number,                      // Thứ tự hiển thị (0, 1, 2, ...)
  isDefault: Boolean,                        // Là media mặc định
  isDeleted: Boolean,                        // Soft delete flag
  createdAt: Date,
  updatedAt: Date
}
```

### Chỉ mục (Indexes)
- `{ product: 1, displayOrder: 1 }` - Lấy media theo sản phẩm và thứ tự
- `{ product: 1, isDeleted: 1 }` - Lọc media đã xóa

---

## API Endpoints

### 1. GET /api/v1/product-media/:productId

Lấy tất cả media của một sản phẩm (không bao gồm media đã xóa).

**Yêu cầu (Request)**
```
GET /api/v1/product-media/65abc123def456789012345
```

**Tham số (Parameters)**
| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| productId | String (ObjectId) | ✓ | ID của sản phẩm |

**Phản hồi Thành công (200)**
```json
{
  "product": "65abc123def456789012345",
  "media": [
    {
      "_id": "65abc123def456789012346",
      "product": "65abc123def456789012345",
      "mediaType": "image",
      "fileFormat": "jpg",
      "filePath": "1712234567-123456789.jpg",
      "fileName": "product-image-1.jpg",
      "fileSize": 204800,
      "mimeType": "image/jpeg",
      "altText": "Ảnh sản phẩm chính",
      "displayOrder": 0,
      "isDefault": true,
      "isDeleted": false,
      "createdAt": "2024-04-04T10:30:00Z",
      "updatedAt": "2024-04-04T10:30:00Z"
    },
    {
      "_id": "65abc123def456789012347",
      "product": "65abc123def456789012345",
      "mediaType": "video",
      "fileFormat": "mp4",
      "filePath": "1712234568-987654321.mp4",
      "fileName": "product-demo.mp4",
      "fileSize": 5242880,
      "mimeType": "video/mp4",
      "altText": "Video demo sản phẩm",
      "displayOrder": 1,
      "isDefault": false,
      "isDeleted": false,
      "createdAt": "2024-04-04T10:32:00Z",
      "updatedAt": "2024-04-04T10:32:00Z"
    }
  ],
  "total": 2
}
```

**Lỗi (Error)**
```json
// 404 - Product not found
{ "message": "San pham khong tim thay" }

// 400 - Invalid product ID
{ "message": "Product ID khong hop le" }
```

---

### 2. POST /api/v1/product-media/upload/:productId

Tải lên media mới cho sản phẩm (ảnh hoặc video).

**Yêu cầu (Request)**
```
POST /api/v1/product-media/upload/65abc123def456789012345
Content-Type: multipart/form-data

file: [binary data]
mediaType: "image" (or "video")
altText: "Ảnh sản phẩm chính"
```

**Tham số (Parameters)**
| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| productId | String (ObjectId) | ✓ | ID của sản phẩm |
| file | File | ✓ | File media (image/video) |
| mediaType | String | - | 'image' hoặc 'video' (mặc định: 'image') |
| altText | String | - | Alt text cho media |

**Giới Hạn File**
- **Ảnh**: Kích thước tối đa 10MB (cấu hình qua `MAX_IMAGE_UPLOAD_SIZE_MB` env)
- **Video**: Kích thước tối đa 100MB (cấu hình qua `MAX_VIDEO_UPLOAD_SIZE_MB` env)
- **Định dạng ảnh cho phép**: JPEG, PNG, WebP, GIF
- **Định dạng video cho phép**: MP4, WebM, OGG, MOV

**Phản hồi Thành công (200)**
```json
{
  "message": "Upload thanh cong",
  "media": {
    "_id": "65abc123def456789012347",
    "product": "65abc123def456789012345",
    "mediaType": "image",
    "fileFormat": "jpg",
    "filePath": "1712234569-111111111.jpg",
    "fileName": "new-product-image.jpg",
    "fileSize": 307200,
    "mimeType": "image/jpeg",
    "altText": "Ảnh sản phẩm chính",
    "displayOrder": 0,
    "isDefault": true,
    "isDeleted": false,
    "createdAt": "2024-04-04T10:35:00Z",
    "updatedAt": "2024-04-04T10:35:00Z"
  }
}
```

**Quy Tắc Tự Động**
- Media đầu tiên tải lên sẽ tự động được đặt làm `isDefault: true`
- Các media tiếp theo có `displayOrder` tăng dần (0, 1, 2, ...)

**Lỗi (Error)**
```json
// 404 - Product not found
{ "message": "San pham khong tim thay" }

// 400 - File format not supported
{ "message": "Dinh dang file khong dung" }

// 400 - File not provided
{ "message": "File khong ton tai" }

// 400 - Invalid product ID
{ "message": "Product ID khong hop le" }
```

---

### 3. PUT /api/v1/product-media/:mediaId

Cập nhật metadata của media (alt text, thứ tự, media mặc định).

**Yêu cầu (Request)**
```
PUT /api/v1/product-media/65abc123def456789012347
Content-Type: application/json

{
  "altText": "Ảnh sản phẩm mới",
  "displayOrder": 2,
  "isDefault": true
}
```

**Tham số Body (Body Parameters)**
| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| altText | String | - | Alt text mới cho media |
| displayOrder | Number | - | Thứ tự hiển thị |
| isDefault | Boolean | - | Đặt làm media mặc định |

**Phản hồi Thành công (200)**
```json
{
  "message": "Cap nhat thanh cong",
  "media": {
    "_id": "65abc123def456789012347",
    "product": "65abc123def456789012345",
    "mediaType": "image",
    "fileFormat": "jpg",
    "filePath": "1712234569-111111111.jpg",
    "fileName": "new-product-image.jpg",
    "fileSize": 307200,
    "mimeType": "image/jpeg",
    "altText": "Ảnh sản phẩm mới",
    "displayOrder": 2,
    "isDefault": true,
    "isDeleted": false,
    "createdAt": "2024-04-04T10:35:00Z",
    "updatedAt": "2024-04-04T10:36:00Z"
  }
}
```

**Quy Tắc Tự Động**
- Khi `isDefault: true`, tất cả media khác của sản phẩm sẽ được đặt `isDefault: false`

**Lỗi (Error)**
```json
// 404 - Media not found
{ "message": "Media khong tim thay" }

// 400 - Invalid media ID
{ "message": "Media ID khong hop le" }

// 400 - No data to update
{ "message": "Khong co du lieu de cap nhat" }
```

---

### 4. DELETE /api/v1/product-media/:mediaId

Xóa media (soft delete - đánh dấu `isDeleted: true` và xóa file khỏi server).

**Yêu cầu (Request)**
```
DELETE /api/v1/product-media/65abc123def456789012347
```

**Tham số (Parameters)**
| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| mediaId | String (ObjectId) | ✓ | ID của media |

**Phản hồi Thành công (200)**
```json
{
  "message": "Xoa thanh cong"
}
```

**Lỗi (Error)**
```json
// 404 - Media not found
{ "message": "Media khong tim thay" }

// 400 - Invalid media ID
{ "message": "Media ID khong hop le" }
```

---

### 5. PUT /api/v1/product-media/reorder/:productId

Sắp xếp lại thứ tự hiển thị của tất cả media trong một sản phẩm.

**Yêu cầu (Request)**
```
PUT /api/v1/product-media/reorder/65abc123def456789012345
Content-Type: application/json

{
  "mediaOrder": [
    { "mediaId": "65abc123def456789012346", "displayOrder": 0 },
    { "mediaId": "65abc123def456789012347", "displayOrder": 1 },
    { "mediaId": "65abc123def456789012348", "displayOrder": 2 }
  ]
}
```

**Tham số Body (Body Parameters)**
| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| mediaOrder | Array | ✓ | Mảng chứa mediaId và displayOrder |
| mediaOrder[].mediaId | String (ObjectId) | ✓ | ID của media |
| mediaOrder[].displayOrder | Number | ✓ | Thứ tự mới (0, 1, 2, ...) |

**Phản hồi Thành công (200)**
```json
{
  "message": "Sap xep lai media thanh cong"
}
```

**Lỗi (Error)**
```json
// 404 - Product not found
{ "message": "San pham khong tim thay" }

// 404 - Media not found
{ "message": "Media khong tim thay: 65abc123def456789012347" }

// 400 - Invalid media ID format
{ "message": "Media ID khong hop le: invalid-id" }

// 400 - Invalid mediaOrder parameter
{ "message": "mediaOrder phai la mot mang" }
```

---

## Authentication & Authorization

Tất cả các endpoint POST, PUT, DELETE yêu cầu:
- **Đăng nhập**: Có token JWT hợp lệ trong Header `Authorization: Bearer <token>`
- **Quyền**: Phải có role `Admin`

GET endpoints không yêu cầu đăng nhập.

---

## Audit Logging

Tất cả thao tác sẽ được ghi lại trong AuditLog:

| Thao tác | Action | Mô tả |
|---------|--------|-------|
| Tải lên media | `PRODUCT_MEDIA_UPLOAD` | Tải lên ảnh/video mới |
| Cập nhật metadata | `PRODUCT_MEDIA_UPDATE` | Cập nhật alt text, thứ tự, mặc định |
| Xóa media | `PRODUCT_MEDIA_DELETE` | Xóa media |
| Sắp xếp lại | `PRODUCT_MEDIA_REORDER` | Sắp xếp thứ tự media |

---

## Ví Dụ Sử Dụng (Usage Examples)

### Ví dụ 1: Lấy tất cả media của sản phẩm

```bash
curl -X GET "http://localhost:3000/api/v1/product-media/65abc123def456789012345"
```

### Ví dụ 2: Tải lên ảnh mới

```bash
curl -X POST "http://localhost:3000/api/v1/product-media/upload/65abc123def456789012345" \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/image.jpg" \
  -F "mediaType=image" \
  -F "altText=Ảnh sản phẩm chính"
```

### Ví dụ 3: Tải lên video demo

```bash
curl -X POST "http://localhost:3000/api/v1/product-media/upload/65abc123def456789012345" \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/video.mp4" \
  -F "mediaType=video" \
  -F "altText=Video demo sản phẩm"
```

### Ví dụ 4: Cập nhật alt text

```bash
curl -X PUT "http://localhost:3000/api/v1/product-media/65abc123def456789012347" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "altText": "Ảnh sản phẩm mới",
    "isDefault": true
  }'
```

### Ví dụ 5: Sắp xếp lại media

```bash
curl -X PUT "http://localhost:3000/api/v1/product-media/reorder/65abc123def456789012345" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "mediaOrder": [
      { "mediaId": "65abc123def456789012347", "displayOrder": 0 },
      { "mediaId": "65abc123def456789012348", "displayOrder": 1 }
    ]
  }'
```

### Ví dụ 6: Xóa media

```bash
curl -X DELETE "http://localhost:3000/api/v1/product-media/65abc123def456789012347" \
  -H "Authorization: Bearer <token>"
```

---

## Cấu Hình Environment

Thêm các biến sau vào `.env`:

```env
# Upload size limits (in MB)
MAX_IMAGE_UPLOAD_SIZE_MB=10
MAX_VIDEO_UPLOAD_SIZE_MB=100
```

---

## Ngôn Ngữ & Lỗi (Error) 

Tất cả các thông báo lỗi và thành công sử dụng tiếng Việt. Ví dụ:
- `"Xoa thanh cong"` - Xóa thành công
- `"Cap nhat thanh cong"` - Cập nhật thành công
- `"Upload thanh cong"` - Tải lên thành công
- `"Khong co du lieu de cap nhat"` - Không có dữ liệu để cập nhật
- `"Dinh dang file khong dung"` - Định dạng file không đúng

---

## Hướng Dẫn Tích Hợp Frontend

### React Example

```jsx
// Lấy media của sản phẩm
const fetchProductMedia = async (productId) => {
  const response = await fetch(`/api/v1/product-media/${productId}`);
  const data = await response.json();
  return data.media;
};

// Tải lên ảnh/video
const uploadMedia = async (productId, file, mediaType, altText) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mediaType', mediaType);
  formData.append('altText', altText);

  const response = await fetch(`/api/v1/product-media/upload/${productId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  return response.json();
};

// Cập nhật media
const updateMedia = async (mediaId, updates) => {
  const response = await fetch(`/api/v1/product-media/${mediaId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });
  return response.json();
};

// Xóa media
const deleteMedia = async (mediaId) => {
  const response = await fetch(`/api/v1/product-media/${mediaId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
};
```

---

## Ghi Chú

- **Soft Delete**: Media được xóa mềm (đánh dấu `isDeleted: true`) nhưng file vẫn được xóa khỏi server
- **Thuật toán `isDefault`**: Chỉ có một media được đặt làm mặc định cho mỗi sản phẩm; nếu cập nhật media khác thành `isDefault: true`, media cũ sẽ tự động thành `isDefault: false`
- **Duplikasi**: Có thể có nhiều media có cùng displayOrder (sẽ sắp xếp theo `createdAt` khi hiển thị)
