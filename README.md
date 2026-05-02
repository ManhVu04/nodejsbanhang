# MiniShop E-commerce

Ứng dụng thương mại điện tử full-stack: **Frontend React 19 + Vite** và **Backend Express + MongoDB**. Hỗ trợ mua hàng, quản trị admin, thanh toán VNPay, xác thực JWT, đăng nhập Google, quản lý kho, voucher, đánh giá, trả hàng và nhật ký kiểm toán (audit logs).

> Sản phẩm production: <https://minishopecommerce.click/shop>

---

## Mục lục

- [Tổng quan](#tổng-quan)
- [Tính năng chính](#tính-năng-chính)
- [Kiến trúc hệ thống](#kiến-trúc-hệ-thống)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [API Backend](#api-backend)
- [Biến môi trường](#biến-môi-trường)
- [Hướng dẫn chạy local](#hướng-dẫn-chạy-local)
- [Triển khai Docker production](#triển-khai-docker-production)
- [CI/CD GitHub Actions](#cicd-github-actions)
- [Kiểm thử](#kiểm-thử)
- [Google Login Checklist](#google-login-checklist)
- [Sự cố thường gặp](#sự-cố-thường-gặp)
- [Ghi chú bảo mật](#ghi-chú-bảo-mật)

---

## Tổng quan

MiniShop được tách thành hai service độc lập:

- **Frontend** (Vite + React 19, SPA): phục vụ giao diện khách hàng và bảng điều khiển admin, đặt dưới base path `/shop`.
- **Backend** (Express 4 + Mongoose): cung cấp REST API tại `/api/v1`, xử lý nghiệp vụ, xác thực, thanh toán và audit logs.
- **MongoDB**: lưu sản phẩm, đơn hàng, người dùng, kho, voucher, đánh giá, yêu cầu trả hàng, audit log…
- **Nginx** (trong container frontend): vừa serve file static từ `dist`, vừa làm reverse proxy chuyển `/shop/api/*` về backend.

Production sử dụng `https://minishopecommerce.click/shop` cho UI và `https://minishopecommerce.click/shop/api/v1` cho API (Nginx rewrite về `/api/v1` ở backend).

---

## Tính năng chính

### Khách hàng

- Đăng ký, đăng nhập, đăng xuất, đổi/quên/reset mật khẩu (qua email).
- **Đăng nhập Google** bằng Google Identity Services (One Tap + nút Sign-In).
- Duyệt sản phẩm, tìm kiếm, lọc theo danh mục, xem chi tiết, sản phẩm liên quan.
- Giỏ hàng (thêm/sửa/xoá số lượng, đồng bộ cho user đã đăng nhập).
- Wishlist (thêm/xoá sản phẩm yêu thích).
- Đặt hàng, theo dõi lịch sử và chi tiết đơn.
- Thanh toán **VNPay** (sandbox/production) với return URL và IPN.
- Áp mã giảm giá (voucher).
- Gửi yêu cầu trả/hoàn hàng và xem trạng thái.
- Đánh giá sản phẩm (rating + bình luận).
- Cập nhật hồ sơ cá nhân, đổi avatar, quản lý sổ địa chỉ.

### Quản trị (Admin)

- **Dashboard** thống kê: doanh thu theo thời gian, top sản phẩm bán chạy, phân bổ trạng thái đơn, đơn hàng gần đây.
- **CRUD** sản phẩm, danh mục, voucher, role.
- **Quản lý kho**: tồn kho theo biến thể, lịch sử điều chỉnh kho (`inventoryLogs`), cảnh báo hết hàng.
- **Quản lý đơn hàng**: cập nhật trạng thái, xem lịch sử thanh toán.
- **Quản lý yêu cầu trả hàng**: duyệt/từ chối, hoàn kho khi cần.
- **Quản lý người dùng**: tìm kiếm, đổi vai trò, khoá/mở tài khoản.
- **Nhật ký hệ thống (Audit Logs)**: ghi lại mọi hành động admin (ai, làm gì, trên tài nguyên nào, trước/sau, IP) — có bộ lọc theo hành động, loại tài nguyên, trạng thái, khoảng ngày và thống kê tổng quan.
- **Import dữ liệu** qua file Excel (route upload).

---

## Kiến trúc hệ thống

```
[Browser] ──► /shop ──► [Nginx (frontend container)] ──► dist (React SPA)
                                │
                                └─► /shop/api/v1/* ──► rewrite ──► [Backend Express :3000] ──► [MongoDB]
```

Luồng cơ bản trong production:

1. Trình duyệt truy cập `https://minishopecommerce.click/shop`.
2. Nginx trong container frontend serve file static (build Vite) tại `/shop`.
3. Mọi request `/shop/api/*` được Nginx proxy sang container backend (`/api/*`).
4. Backend xử lý nghiệp vụ, truy vấn MongoDB, ghi audit log nếu là hành động admin.
5. Backend trả JSON về frontend.

---

## Công nghệ sử dụng

### Frontend

- React 19, Vite 8, React Router 7
- Redux Toolkit + React Redux
- Ant Design 6 + `@ant-design/icons`
- Axios (instance có interceptor JWT + auto-logout 401)
- Chart.js + react-chartjs-2 (biểu đồ dashboard)
- react-helmet-async (meta/SEO)

### Backend

- Node.js 20, Express 4
- Mongoose 9
- JWT (`jsonwebtoken`) + `bcrypt`
- `express-validator`, `express-mongo-sanitize`
- `helmet`, `cors`, `express-rate-limit`
- `multer` (upload), `exceljs` (import Excel)
- `nodemailer` (gửi mail reset password)
- `google-auth-library` (verify ID token Google)
- `vnpay` (tạo URL thanh toán + verify return/IPN)

### DevOps

- Docker + Docker Compose (`docker-compose.prod.yml`)
- Nginx (frontend container, reverse proxy `/api`)
- GitHub Actions (test, lint, build, push image, SSH deploy)
- Docker Hub (registry)

---

## Cấu trúc thư mục

```text
.
├── Backend/
│   ├── app.js                 # Khởi tạo Express, middleware, mount routes
│   ├── bin/www                # Entry chạy server (PORT 3000)
│   ├── routes/                # auth, users, products, categories, carts,
│   │                          # orders, vnpay, vouchers, wishlists, reviews,
│   │                          # returns, dashboard, inventories, addresses,
│   │                          # reservations, productMedia, uploads,
│   │                          # roles, auditLogs
│   ├── schemas/               # Mongoose models
│   ├── controllers/           # Tách nghiệp vụ ra khỏi route
│   ├── utils/                 # authHandler, auditHandler, jobs định kỳ…
│   ├── tests/                 # Test với node:test
│   ├── public/                # Asset tĩnh (helper Google login)
│   ├── uploads/               # Ảnh/file upload (mount volume trong Docker)
│   ├── views/                 # EJS (chỉ phục vụ trang lỗi)
│   ├── .env.example           # Mẫu env production
│   ├── .env.local.example     # Mẫu env cho local dev
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/             # HomePage, Products, Cart, Checkout, Orders,
│   │   │   └── admin/         # Dashboard, ProductsManage, OrdersManage,
│   │   │                      # Inventory, Vouchers, Returns, Users,
│   │   │                      # AuditLogs, CategoriesManage
│   │   ├── components/        # AppLayout, AdminLayout, ProtectedRoute…
│   │   ├── store/             # Redux Toolkit slices (auth, cart…)
│   │   └── utils/api.js       # Axios instance + base URL theo /shop
│   ├── nginx.conf             # Cấu hình Nginx production (rewrite /shop/api → /api)
│   ├── vite.config.js         # base: '/shop/', proxy dev → :3000
│   └── Dockerfile
├── docker-compose.prod.yml
├── .env.production.example
├── .github/workflows/deploy.yml
└── README.md
```

---

## API Backend

Base URL: `/api/v1` (production: `https://minishopecommerce.click/shop/api/v1`).

| Nhóm | Prefix | Mô tả |
|---|---|---|
| Auth | `/auth` | `register`, `login`, `logout`, `me`, `forgotpassword`, `resetpassword`, `google/config`, `google/login` |
| Users | `/users` | Cập nhật profile, avatar; admin quản lý người dùng & vai trò |
| Roles | `/roles` | CRUD vai trò (admin) |
| Products | `/products` | Danh sách, tìm kiếm, chi tiết, related; CRUD (admin) |
| Product Media | `/product-media` | Quản lý ảnh phụ của sản phẩm |
| Categories | `/categories` | Danh sách, chi tiết, sản phẩm theo danh mục; CRUD (admin) |
| Carts | `/carts` | Giỏ hàng của user đang đăng nhập |
| Orders | `/orders` | Tạo đơn, đơn của tôi, chi tiết; admin quản lý toàn bộ |
| VNPay | `/vnpay` | Tạo payment URL, return, IPN |
| Vouchers | `/vouchers` | Validate mã, CRUD voucher (admin) |
| Wishlists | `/wishlists` | Xem/thêm/xoá wishlist |
| Reviews | `/reviews` | Danh sách review theo sản phẩm, tạo/xoá review |
| Returns | `/returns` | Tạo yêu cầu trả hàng, xem của tôi, admin duyệt |
| Reservations | `/reservations` | Giữ chỗ tồn kho khi checkout, hết hạn tự release |
| Addresses | `/addresses` | Sổ địa chỉ giao hàng của user |
| Inventories | `/inventories` | Tồn kho và log điều chỉnh kho |
| Dashboard | `/dashboard` | Thống kê tổng hợp cho admin |
| Audit Logs | `/audit-logs` | Lịch sử hành động admin + thống kê (`/audit-logs/stats`) |
| Upload | `/upload` | Upload ảnh sản phẩm, avatar, file Excel |

> ⚠️ Tên route dùng **kebab-case** (ví dụ `/audit-logs`, `/product-media`). Frontend phải gọi đúng dấu gạch ngang, không dùng camelCase.

### Bảo vệ & rate limiting

- Tất cả route admin dùng middleware `CheckLogin` + `CheckRole(['Admin'])`.
- Rate limit toàn cục: mặc định 300 req/15 phút (`RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`).
- Rate limit cho auth (`/auth/login`, `/auth/google/login`, `/auth/forgotpassword`, `/auth/resetpassword`): 10 lần thất bại/15 phút.
- `helmet`, `express-mongo-sanitize`, `cors` whitelist từ `CORS_ORIGIN` + origin của `FRONTEND_URL`.

---

## Biến môi trường

Mẫu đầy đủ ở `.env.production.example` (production) và `Backend/.env.local.example` (local dev).

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `MONGODB_URI` | ✅ | Chuỗi kết nối MongoDB (hỗ trợ replica set) |
| `CORS_ORIGIN` | ✅ | Danh sách origin được phép, cách nhau dấu phẩy |
| `FRONTEND_URL` | ✅ | URL frontend, ví dụ `https://minishopecommerce.click/shop` |
| `JWT_SECRET` | ✅ | Secret ký token JWT |
| `COOKIE_SECURE` | Khuyến nghị | `true` cho HTTPS production |
| `COOKIE_SAME_SITE` | Khuyến nghị | `lax` / `strict` / `none` |
| `GOOGLE_CLIENT_ID` | Để bật Google Login | OAuth Client ID (Web) |
| `RATE_LIMIT_WINDOW_MS` | Tuỳ chọn | Cửa sổ rate limit toàn cục (mặc định 900000) |
| `RATE_LIMIT_MAX` | Tuỳ chọn | Số request tối đa (mặc định 300) |
| `AUTH_RATE_LIMIT_WINDOW_MS` | Tuỳ chọn | Cửa sổ rate limit cho auth |
| `AUTH_RATE_LIMIT_MAX` | Tuỳ chọn | Lần thử thất bại tối đa cho auth |
| `MONGO_RECONNECT_INTERVAL_MS` | Tuỳ chọn | Khoảng reconnect Mongo (chỉ dev) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | Tuỳ chọn | Cấu hình SMTP gửi mail |
| `SMTP_USER` / `SMTP_PASS` / `MAIL_FROM` | Tuỳ chọn | Tài khoản & người gửi mail |
| `VNP_TMN_CODE` / `VNP_HASH_SECRET` | Tuỳ chọn | Thông tin merchant VNPay |
| `VNP_URL` | Tuỳ chọn | Endpoint VNPay (sandbox/production) |
| `VNP_RETURN_URL` | Tuỳ chọn | URL trên frontend nhận return VNPay |

Lưu ý:

- Backend đọc env trực tiếp từ `process.env`.
- Khi chạy local, backend tự nạp `Backend/.env` và `Backend/.env.local` (nếu có).
- File `Backend/.env.local` và `.env.production` đều được `.gitignore`, không commit.

---

## Hướng dẫn chạy local

### 1) Yêu cầu

- Node.js **20+**
- MongoDB chạy local (single node hoặc replica set) hoặc remote (MongoDB Atlas…)
- (Tuỳ chọn) Docker để chạy Mongo replica set bằng compose.

### 2) Chạy Backend

```bash
cd Backend
npm install
npm start          # nodemon ./bin/www, mặc định cổng 3000
```

Trong môi trường dev, nếu `MONGODB_URI` rỗng, backend sẽ thử các URI fallback (replica set):

```
mongodb://127.0.0.1:27017,127.0.0.1:27018,127.0.0.1:27019/nodejs?replicaSet=rs0&...
mongodb://localhost:27017,localhost:27018,localhost:27019/nodejs?replicaSet=rs0&...
```

Để cấu hình local mà không động vào production, copy file mẫu:

```bash
cd Backend
copy .env.local.example .env.local      # Windows
# hoặc: cp .env.local.example .env.local
```

Ví dụ `.env.local`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/nodejs?directConnection=true
CORS_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173/shop
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
JWT_SECRET=dev-only-secret
```

### 3) Chạy Frontend

```bash
cd frontend
npm install
npm run dev        # vite, mặc định cổng 5173
```

Truy cập: <http://localhost:5173/shop>

Vite dev server đã cấu hình proxy:

- `/shop/api` → `http://localhost:3000/api` (rewrite bỏ tiền tố `/shop`)
- `/api` → `http://localhost:3000/api`

> Ứng dụng được serve dưới base `/shop/`. Truy cập `http://localhost:5173/` (không có `/shop`) sẽ trả 404 từ Vite.

---

## Triển khai Docker production

File liên quan: `docker-compose.prod.yml`, `.env.production.example`, `Backend/Dockerfile`, `frontend/Dockerfile`, `frontend/nginx.conf`.

Trên server lần đầu:

```bash
cp .env.production.example .env.production
# Sửa giá trị thật trong .env.production (bí mật, secret, domain…)

docker compose -f docker-compose.prod.yml --env-file .env.production pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --remove-orphans
```

Mặc định:

- `backend` chạy ở cổng `3000` nội bộ (chỉ `expose`, không publish).
- `frontend` (Nginx + dist) publish ra cổng host **`8081`** (`8081:80`) để tránh xung đột với reverse proxy ngoài (Nginx/Traefik trên cổng 80/443).
- Volume `backend_uploads` lưu file upload bền giữa các lần redeploy.

Reverse proxy phía ngoài (ví dụ Nginx host) cần forward `https://minishopecommerce.click/shop` → `http://127.0.0.1:8081/shop`.

---

## CI/CD GitHub Actions

Workflow: `.github/workflows/deploy.yml`. Mỗi lần push lên nhánh `main`:

1. **Quality check**
   - `npm ci` + `npm test` cho `Backend/`.
   - `npm ci` + `npm run lint` + `npm run build` cho `frontend/`.
2. **Build & push Docker image** backend + frontend lên Docker Hub (tag theo commit SHA + `latest`).
3. **Deploy qua SSH**
   - Pull source mới nhất về server.
   - Ghi `.env.production` từ secret `SERVER_ENV_FILE`.
   - `docker compose pull` + `up -d --remove-orphans` để cập nhật.

GitHub Secrets cần khai báo:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`
- `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`
- `SERVER_APP_PATH` (đường dẫn project trên server)
- `SERVER_ENV_FILE` (toàn bộ nội dung `.env.production`)

---

## Kiểm thử

### Backend

```bash
cd Backend
npm test           # node --test tests/*.test.js
```

### Frontend

```bash
cd frontend
npm run lint       # ESLint
npm run build      # Vite build (kiểm tra type/import + build dist)
npm run preview    # Preview bản build local
```

---

## Google Login Checklist

Nếu giao diện báo *“Đăng nhập Google chưa được cấu hình trên hệ thống”*, kiểm tra theo thứ tự:

1. `GOOGLE_CLIENT_ID` đã được set trong `SERVER_ENV_FILE` (production) hoặc `.env.local` (dev).
2. `docker-compose.prod.yml` đã map `GOOGLE_CLIENT_ID` vào service `backend` (đã có sẵn).
3. Đã redeploy backend sau khi cập nhật secret.
4. `GET /api/v1/auth/google/config` trả `{ enabled: true, clientId: "..." }`.
5. Trong Google Cloud Console → OAuth client (Web), **Authorized JavaScript origins** đã thêm:
   - `https://minishopecommerce.click`
   - `http://localhost:5173` (cho dev)
6. Trình duyệt không chặn third-party cookie cho Google (One Tap có thể bị ẩn).

---

## Sự cố thường gặp

### 1) Trang trắng hoặc 404 sau khi deploy

- Đảm bảo truy cập qua `/shop` (Vite `base: '/shop/'`, BrowserRouter `basename="/shop"`).
- Kiểm tra `frontend/nginx.conf` có rewrite `/shop` về `index.html` cho SPA fallback.

### 2) Lỗi CORS

- `CORS_ORIGIN` phải đúng origin thực tế đang truy cập (kể cả port).
- Có thể cấu hình nhiều origin cách nhau bằng dấu phẩy. Backend cũng tự thêm origin từ `FRONTEND_URL`.

### 3) Không kết nối được MongoDB

- Kiểm tra `MONGODB_URI`, đặc biệt khi dùng replica set (`?replicaSet=rs0`).
- Kiểm tra firewall/network giữa container backend và Mongo host.
- Trong dev, nếu Mongo chưa chạy, app sẽ log và **tự retry** theo `MONGO_RECONNECT_INTERVAL_MS`.

### 4) Trang admin Audit Logs quay vòng (loading vô hạn)

- Đảm bảo frontend gọi `/audit-logs` và `/audit-logs/stats` (kebab-case), khớp với `app.use("/api/v1/audit-logs", ...)`.
- Kiểm tra tài khoản hiện tại có role `Admin`; nếu không, request bị 403 và bảng không có dữ liệu.

### 5) Nút Google không hiển thị

- Kiểm tra response của `/api/v1/auth/google/config`.
- Kiểm tra `GOOGLE_CLIENT_ID` và đã redeploy backend.
- Mở DevTools → tab Console xem có lỗi loading `accounts.google.com/gsi/client` không.

### 6) Bị giới hạn request (`429 Too Many Requests`)

- Đó là rate limiter toàn cục. Tăng `RATE_LIMIT_MAX` hoặc `RATE_LIMIT_WINDOW_MS` nếu cần.
- Với endpoint auth, dùng `AUTH_RATE_LIMIT_*`.

---

## Ghi chú bảo mật

- Không commit `JWT_SECRET`, `SMTP_PASS`, `VNP_HASH_SECRET`, `GOOGLE_CLIENT_ID` của môi trường thật.
- Nếu lộ secret, **rotate ngay** và redeploy.
- Production phải dùng HTTPS, set `COOKIE_SECURE=true` và `COOKIE_SAME_SITE=none` nếu frontend khác origin với backend.
- Mọi hành động admin đều được ghi vào collection `auditLogs` (xem trang `/shop/admin/audit-logs`) phục vụ truy vết.

---

## Tài liệu liên quan

- Mẫu env production: `.env.production.example`
- Mẫu env dev: `Backend/.env.local.example`
- Workflow deploy: `.github/workflows/deploy.yml`
- Cấu hình Nginx frontend: `frontend/nginx.conf`
