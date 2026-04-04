# ProductMedia - Lệnh Postman & cURL Chi Tiết

## 🔑 Thay Thế Các Biến Sau:

```
YOUR_ADMIN_TOKEN = Token JWT của admin (lấy từ auth endpoint)
PRODUCT_ID = ID của sản phẩm (VD: 65abc123def456789012345)
MEDIA_ID = ID của media (VD: 65abc123def456789012347)
FILE_PATH = Đường dẫn file cần upload (VD: /path/to/image.jpg)
```

---

## 1️⃣ GET - Lấy Tất Cả Media của Sản Phẩm

### Postman
```
Method: GET
URL: http://localhost:3000/api/v1/product-media/{{product_id}}

Headers:
  (Không cần auth - public endpoint)

Body: (Empty)
```

### cURL
```bash
curl -X GET "http://localhost:3000/api/v1/product-media/65abc123def456789012345"
```

### Response:
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
    }
  ],
  "total": 1
}
```

---

## 2️⃣ POST - Upload Ảnh

### Postman
```
Method: POST
URL: http://localhost:3000/api/v1/product-media/upload/{{product_id}}

Headers:
  Authorization: Bearer {{admin_token}}

Body (form-data):
  file: [SELECT FILE HERE]
  mediaType: image
  altText: Ảnh sản phẩm chính
```

### cURL
```bash
curl -X POST "http://localhost:3000/api/v1/product-media/upload/65abc123def456789012345" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "file=@/path/to/image.jpg" \
  -F "mediaType=image" \
  -F "altText=Ảnh sản phẩm chính"
```

### Response:
```json
{
  "message": "Upload thanh cong",
  "media": {
    "_id": "65abc123def456789012347",
    "product": "65abc123def456789012345",
    "mediaType": "image",
    "fileFormat": "jpg",
    "filePath": "1712234569-111111111.jpg",
    "fileName": "product-image-1.jpg",
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

---

## 3️⃣ POST - Upload Video

### Postman
```
Method: POST
URL: http://localhost:3000/api/v1/product-media/upload/{{product_id}}

Headers:
  Authorization: Bearer {{admin_token}}

Body (form-data):
  file: [SELECT VIDEO FILE HERE]
  mediaType: video
  altText: Video demo sản phẩm
```

### cURL
```bash
curl -X POST "http://localhost:3000/api/v1/product-media/upload/65abc123def456789012345" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "file=@/path/to/video.mp4" \
  -F "mediaType=video" \
  -F "altText=Video demo sản phẩm"
```

### Định Dạng Hỗ Trợ:
- **Video**: MP4, WebM, OGG, MOV
- **Max Size**: 100MB (cấu hình qua `MAX_VIDEO_UPLOAD_SIZE_MB` env)

---

## 4️⃣ PUT - Cập Nhật Alt Text

### Postman
```
Method: PUT
URL: http://localhost:3000/api/v1/product-media/{{media_id}}

Headers:
  Authorization: Bearer {{admin_token}}
  Content-Type: application/json

Body (raw - JSON):
{
  "altText": "Ảnh sản phẩm cập nhật"
}
```

### cURL
```bash
curl -X PUT "http://localhost:3000/api/v1/product-media/65abc123def456789012347" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "altText": "Ảnh sản phẩm cập nhật"
  }'
```

---

## 5️⃣ PUT - Đặt Ảnh/Video Làm Mặc Định

### Postman
```
Method: PUT
URL: http://localhost:3000/api/v1/product-media/{{media_id}}

Headers:
  Authorization: Bearer {{admin_token}}
  Content-Type: application/json

Body (raw - JSON):
{
  "isDefault": true
}
```

### cURL
```bash
curl -X PUT "http://localhost:3000/api/v1/product-media/65abc123def456789012347" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isDefault": true
  }'
```

**Lưu Ý**: Chỉ 1 media làm mặc định cho mỗi sản phẩm. Các media khác sẽ tự động thành `false`.

---

## 6️⃣ PUT - Cập Nhật Thứ Tự Hiển Thị

### Postman
```
Method: PUT
URL: http://localhost:3000/api/v1/product-media/{{media_id}}

Headers:
  Authorization: Bearer {{admin_token}}
  Content-Type: application/json

Body (raw - JSON):
{
  "displayOrder": 2
}
```

### cURL
```bash
curl -X PUT "http://localhost:3000/api/v1/product-media/65abc123def456789012347" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "displayOrder": 2
  }'
```

---

## 7️⃣ PUT - Sắp Xếp Lại Tất Cả Media (Gallery Reorder)

### Postman
```
Method: PUT
URL: http://localhost:3000/api/v1/product-media/reorder/{{product_id}}

Headers:
  Authorization: Bearer {{admin_token}}
  Content-Type: application/json

Body (raw - JSON):
{
  "mediaOrder": [
    {
      "mediaId": "65abc123def456789012346",
      "displayOrder": 0
    },
    {
      "mediaId": "65abc123def456789012347",
      "displayOrder": 1
    },
    {
      "mediaId": "65abc123def456789012348",
      "displayOrder": 2
    }
  ]
}
```

### cURL
```bash
curl -X PUT "http://localhost:3000/api/v1/product-media/reorder/65abc123def456789012345" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mediaOrder": [
      {
        "mediaId": "65abc123def456789012346",
        "displayOrder": 0
      },
      {
        "mediaId": "65abc123def456789012347",
        "displayOrder": 1
      },
      {
        "mediaId": "65abc123def456789012348",
        "displayOrder": 2
      }
    ]
  }'
```

---

## 8️⃣ DELETE - Xóa Media

### Postman
```
Method: DELETE
URL: http://localhost:3000/api/v1/product-media/{{media_id}}

Headers:
  Authorization: Bearer {{admin_token}}

Body: (Empty)
```

### cURL
```bash
curl -X DELETE "http://localhost:3000/api/v1/product-media/65abc123def456789012347" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Response:
```json
{
  "message": "Xoa thanh cong"
}
```

---

## 🧪 Kịch Bản Test Hoàn Chỉnh

### Kịch Bản 1: Tạo Gallery 3 Ảnh

```bash
# Bước 1: Upload ảnh 1
curl -X POST "http://localhost:3000/api/v1/product-media/upload/PRODUCT_ID" \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@image1.jpg" \
  -F "mediaType=image" \
  -F "altText=Ảnh góc trước"

# Bước 2: Upload ảnh 2
curl -X POST "http://localhost:3000/api/v1/product-media/upload/PRODUCT_ID" \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@image2.jpg" \
  -F "mediaType=image" \
  -F "altText=Ảnh góc sau"

# Bước 3: Upload ảnh 3
curl -X POST "http://localhost:3000/api/v1/product-media/upload/PRODUCT_ID" \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@image3.jpg" \
  -F "mediaType=image" \
  -F "altText=Ảnh chi tiết"

# Bước 4: Lấy tất cả media để xem display order
curl -X GET "http://localhost:3000/api/v1/product-media/PRODUCT_ID"

# Bước 5: Sắp xếp theo thứ tự mong muốn
curl -X PUT "http://localhost:3000/api/v1/product-media/reorder/PRODUCT_ID" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mediaOrder": [
      { "mediaId": "MEDIA_ID_3", "displayOrder": 0 },
      { "mediaId": "MEDIA_ID_1", "displayOrder": 1 },
      { "mediaId": "MEDIA_ID_2", "displayOrder": 2 }
    ]
  }'
```

---

### Kịch Bản 2: Upload Ảnh + Video + Đặt Mặc Định

```bash
# Bước 1: Upload ảnh
UPLOAD_IMAGE=$(curl -X POST "http://localhost:3000/api/v1/product-media/upload/PRODUCT_ID" \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@main.jpg" \
  -F "mediaType=image" \
  -F "altText=Ảnh chính")

# Bước 2: Upload video
UPLOAD_VIDEO=$(curl -X POST "http://localhost:3000/api/v1/product-media/upload/PRODUCT_ID" \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@demo.mp4" \
  -F "mediaType=video" \
  -F "altText=Video demo")

# Bước 3: Lấy media IDs từ response và đặt video làm mặc định
# (Lấy video mediaId từ step 2 response)
curl -X PUT "http://localhost:3000/api/v1/product-media/VIDEO_MEDIA_ID" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isDefault": true
  }'

# Bước 4: Xác nhận
curl -X GET "http://localhost:3000/api/v1/product-media/PRODUCT_ID"
```

---

## ⚠️ Lỗi Thường Gặp

| Lỗi | Nguyên Nhân | Giải Pháp |
|-----|-----------|----------|
| `401 Unauthorized` | Không có token hoặc token hết hạn | Cung cấp token hợp lệ `Authorization: Bearer TOKEN` |
| `403 Forbidden` | Không phải Admin | Đảm bảo user có role `Admin` |
| `404 Not Found` | Product/Media ID không tồn tại | Kiểm tra lại ID |
| `400 Bad Request` | Định dạng file không đúng | Upload file đúng format (JPG, PNG, MP4, etc.) |
| `413 Payload Too Large` | File vượt quá giới hạn | Kiểm tra kích thước file vs `MAX_*_UPLOAD_SIZE_MB` |

---

## 📋 Checklist Setup

- [ ] Copy file `ProductMedia_Postman_Collection.json`
- [ ] Import vào Postman: `File > Import > Upload file`
- [ ] Cập nhật variables: `product_id`, `media_id`, `admin_token`
- [ ] Thay `YOUR_ADMIN_TOKEN_HERE` bằng token thực tế
- [ ] Thay `65abc123def456789012345` bằng real Product ID
- [ ] Test GET endpoint trước (không cần auth)
- [ ] Test POST upload ảnh
- [ ] Test PUT cập nhật metadata
- [ ] Test DELETE xóa media
- [ ] Kiểm tra Audit logs

---

## 🚀 Tips

✅ **Lưu variables trong Postman**: Chuột phải trên biến → Set as variable  
✅ **Test automation**: Sử dụng `Tests` tab trong Postman để verify response  
✅ **Lập lịch requests**: `Collection > Run Collection` để test toàn bộ flow  
✅ **Export/Share**: Export collection để chia sẻ với team  

---

**Hết! Copy và sử dụng công việc ha! 🎉**
