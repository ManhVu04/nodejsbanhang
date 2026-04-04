# ProductMedia Implementation Guide  

## Tích Hợp Database Migration

Khi triển khai ProductMedia lần đầu, không cần migration vì đây là schema mới hoàn toàn. Chỉ cần đảm bảo schema được load khi ứng dụng khởi động.

```javascript
// Trong app.js, các schema sẽ tự động được load qua require()
let productMediaSchema = require('../schemas/productMedia');
```

---

## Triển Khai Từng Bước

### 1. Backend Setup
✅ **Hoàn thành:**
- [x] Schema `productMedia.js` - Định nghĩa cấu trúc dữ liệu
- [x] Routes `productMedia.js` - API endpoints cho CRUD
- [x] Updated `uploadHandler.js` - Hỗ trợ upload video
- [x] Registered routes trong `app.js`

### 2. Frontend Components (Tiếp theo)

Các component cần tạo cho admin panel:

```
src/pages/admin/
├── ProductMediaManagement.jsx      # Quản lý media sản phẩm
├── ProductMediaUpload.jsx           # Form tải lên media
└── ProductMediaGallery.jsx          # Hiển thị gallery media
```

### 3. Frontend Hooks (Tiếp theo)

```javascript
// useProductMedia.js
export useProductMedia = (productId) => {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // fetchMedia()
  // uploadMedia()
  // updateMedia()
  // deleteMedia()
  // reorderMedia()
};
```

---

## Naming Conventions Verification

Theo SKILL.md, kiểm tra naming consistency:

✅ **Chuẩn:**
- Biến: `mediaType`, `filePath`, `displayOrder` - camelCase ✓
- Hàm: `uploadMedia`, `deleteMedia`, `reorderMedia` - camelCase ✓
- Const: `MAX_IMAGE_UPLOAD_SIZE_MB` - UPPER_SNAKE_CASE ✓
- Schema: `productMedia` - camelCase (model name) ✓

---

## Data Safety & Consistency

### Transaction Usage

Hiện tại, endpoints không sử dụng transaction vì:
- Mỗi media là một document độc lập
- Xóa file từ disk không thể rollback
- Audit logging được log riêng biệt

### Soft Delete Strategy

```javascript
// Media không bao giờ được xóa vĩnh viễn
media.isDeleted = true;
await media.save();

// File được xóa khỏi disk
fs.unlinkSync(filePath);

// Khôi phục (nếu cần): isDeleted = false
```

### Default Media Logic

Mỗi sản phẩm chỉ có 1 media mặc định:

```javascript
// Khi cập nhật isDefault = true
productMediaSchema.pre('save', async function(next) {
    if (this.isDefault && !this.isDeleted) {
        await mongoose.model('productMedia').updateMany(
            { 
                product: this.product, 
                _id: { $ne: this._id },
                isDeleted: false 
            },
            { isDefault: false }
        );
    }
    next();
});
```

---

## Error Handling Patterns

Tất cả endpoints follow error handling strategy:

```
1. Validate input (ID format, required fields)
2. Check resource exists
3. Validate authorization (admin guard)
4. Execute operation
5. Log audit action (success/failure)
6. Return appropriate status code + message
```

**Status Codes:**
- `200` - Thành công
- `400` - Lỗi input, validation, file format
- `404` - Resource không tìm thấy

---

## Security Checklist

✅ **File Upload Security:**
- Multer fileFilter xác minh MIME type
- File size limits được enforce
- Tên file được hash: `Date.now() + '-' + random`
- Chỉ cho phép định dạng cụ thể (image/video)

✅ **Access Control:**
- Tất cả POST/PUT/DELETE yêu cầu Admin role
- GET endpoints công khai (không nhạy cảm)
- AdminGuard middleware: `[CheckLogin, CheckRole(['Admin'])]`

✅ **SQL Injection / NoSQL Injection:**
- Sử dụng Mongoose schema validation
- ObjectId validation: `mongoose.Types.ObjectId.isValid()`

---

## Performance Optimization

### Indexes
```javascript
// Tối ưu query hiệu suất
productMediaSchema.index({ product: 1, displayOrder: 1 });
productMediaSchema.index({ product: 1, isDeleted: 1 });
```

### Query Optimization
```javascript
// ❌ Tránh N+1 queries
media.populate('product')

// ✅ Dùng select nếu chỉ cần fields cụ thể
.select('_id product mediaType filePath')
```

---

## Monitoring & Debugging

### Logs để theo dõi

1. **Audit Logs** - Tất cả thao tác admin
   ```json
   {
     "action": "PRODUCT_MEDIA_UPLOAD",
     "adminId": "...",
     "success": true,
     "description": "Uploaded image for product: ..."
   }
   ```

2. **Error Logs** - Failed operations
   ```json
   {
     "errorMessage": "File size exceeds limit",
     "success": false
   }
   ```

### Debugging Tips

- Check file permissions trong `/uploads` folder
- Verify MIME types bằng `file -b --mime-type <file>`
- Test upload: `curl -F "file=@test.jpg" ...`

---

## Giới Hạn & Hạn Chế

❌ **Không hỗ trợ:**
- Rotate/crop ảnh trực tiếp (nên xử lý frontend)
- Compression tự động (config ngoài trong deploy)
- Video transcoding (cần ffmpeg thêm)
- Watermark ảnh (frontend solution)

✅ **Định dạng được hỗ trợ:**
- **Ảnh**: JPG, PNG, WebP, GIF, JPEG
- **Video**: MP4, WebM, OGG, MOV

---

## Advanced Usage

### Batch Upload

```javascript
// Frontend: Upload nhiều file cùng lúc
const uploadBatch = async (productId, files) => {
  const promises = files.map(file => 
    uploadMedia(productId, file, 'image', file.name)
  );
  return Promise.all(promises);
};
```

### Reorder Gallery

```javascript
// Frontend: Drag-n-drop reorder
const onReorder = async (productId, newOrder) => {
  const reorderData = newOrder.map((media, index) => ({
    mediaId: media._id,
    displayOrder: index
  }));
  
  await updateMediaOrder(productId, reorderData);
};
```

### Gallery Pagination

```javascript
// Nếu sản phẩm có 100+ media, client-side pagination
const getMediaPage = (media, page, pageSize) => {
  return media.slice((page - 1) * pageSize, page * pageSize);
};
```

---

## Migration từ Old Images Field

Nếu muốn migrate từ `products.images[]` cũ sang ProductMedia mới:

```javascript
// Migration script
const migrate = async () => {
  const products = await productSchema.find({ images: { $exists: true } });
  
  for (const product of products) {
    for (const [index, imagePath] of product.images.entries()) {
      const media = new productMediaSchema({
        product: product._id,
        mediaType: 'image',
        filePath: imagePath,
        fileName: path.basename(imagePath),
        fileFormat: path.extname(imagePath).substring(1),
        displayOrder: index,
        isDefault: index === 0,
        // Lấy file size từ disk
        fileSize: fs.statSync(path.join(__dirname, '../uploads', imagePath)).size,
        mimeType: 'image/jpeg' // Hoặc detect từ file
      });
      await media.save();
    }
  }
};
```

---

## Testing Checklist

```
[ ] GET /product-media/:productId - lấy media
[ ] GET /product-media/:productId - empty result
[ ] POST /upload/:productId - upload ảnh
[ ] POST /upload/:productId - upload video
[ ] POST /upload/:productId - file format không đúng
[ ] POST /upload/:productId - file size quá lớn
[ ] POST /upload/:productId - product không tồn tại
[ ] PUT /:mediaId - update alt text
[ ] PUT /:mediaId - update displayOrder
[ ] PUT /:mediaId - set isDefault
[ ] PUT /:mediaId - media không tồn tại
[ ] PUT /reorder/:productId - sắp xếp lại
[ ] DELETE /:mediaId - xóa media
[ ] DELETE /:mediaId - verify file deleted
[ ] Admin authorization - POST without token
[ ] Admin authorization - DELETE without role
[ ] Audit logging - verify action logged
```

---

## Related Files

| File | Mục đích |
|------|---------|
| [schemas/productMedia.js](../Backend/schemas/productMedia.js) | Schema định nghĩa |
| [routes/productMedia.js](../Backend/routes/productMedia.js) | API routes |
| [utils/uploadHandler.js](../Backend/utils/uploadHandler.js) | Upload config |
| [app.js](../Backend/app.js) | Route registration |
| [PRODUCT_MEDIA_API.md](../PRODUCT_MEDIA_API.md) | API documentation |

---

## Liên Hệ & Support

Để tích hợp ProductMedia trong frontend hoặc có câu hỏi thêm, xem:
- API Documentation: [PRODUCT_MEDIA_API.md](../PRODUCT_MEDIA_API.md)
- Schema: [productMedia.js](../Backend/schemas/productMedia.js)
- Routes: [productMedia.js](../Backend/routes/productMedia.js)
