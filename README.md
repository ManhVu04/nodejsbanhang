# MiniShop E-commerce

Ung dung thuong mai dien tu full-stack gom Frontend React + Backend Express + MongoDB, ho tro mua hang, quan ly admin, thanh toan VNPay, auth JWT va Google Sign-In.

## Website Production

- Trang web: https://minishopecommerce.click/shop

## Muc Luc

- [Tong Quan](#tong-quan)
- [Tinh Nang Chinh](#tinh-nang-chinh)
- [Kien Truc He Thong](#kien-truc-he-thong)
- [Cong Nghe Su Dung](#cong-nghe-su-dung)
- [Cau Truc Thu Muc](#cau-truc-thu-muc)
- [API Backend](#api-backend)
- [Bien Moi Truong](#bien-moi-truong)
- [Huong Dan Chay Local](#huong-dan-chay-local)
- [Trien Khai Docker Production](#trien-khai-docker-production)
- [CI/CD GitHub Actions](#cicd-github-actions)
- [Kiem Thu](#kiem-thu)
- [Google Login Checklist](#google-login-checklist)
- [Su Co Thuong Gap](#su-co-thuong-gap)

## Tong Quan

MiniShop duoc thiet ke theo kien truc tach frontend va backend:

- Frontend (Vite + React) phuc vu UI/UX cho nguoi dung va admin.
- Backend (Express + Mongoose) cung cap REST API va xu ly nghiep vu.
- MongoDB luu tru du lieu san pham, don hang, nguoi dung, kho, voucher, danh gia...
- Nginx trong container frontend dong vai tro static server va reverse proxy API.

Ung dung su dung duong dan goc /shop o frontend va /api/v1 cho backend.

## Tinh Nang Chinh

### Khach Hang

- Dang ky, dang nhap, dang xuat, doi/quen mat khau.
- Dang nhap Google (Google Identity Services).
- Xem danh sach san pham, tim kiem, xem chi tiet, san pham lien quan.
- Gio hang (them/giam/sua/xoa so luong).
- Wishlist.
- Dat hang va theo doi lich su don.
- Xem chi tiet don hang.
- Thanh toan VNPay.
- Gui yeu cau tra hang/hoan hang.
- Danh gia san pham.
- Cap nhat thong tin ca nhan, avatar.

### Quan Tri (Admin)

- Dashboard thong ke (doanh thu, top san pham, trang thai don, don gan day).
- CRUD san pham, danh muc, voucher.
- Quan ly ton kho va lich su bien dong kho.
- Quan ly tat ca don hang, cap nhat trang thai don.
- Quan ly yeu cau tra hang.
- Quan ly user/role (theo phan quyen).
- Import du lieu qua file Excel (upload route).

## Kien Truc He Thong

Luong co ban production:

1. Trinh duyet truy cap /shop.
2. Nginx frontend phuc vu file static tu dist.
3. Cac request /shop/api/* duoc proxy sang backend /api/*.
4. Backend xu ly nghiep vu, truy van MongoDB.
5. Backend tra JSON response ve frontend.

## Cong Nghe Su Dung

### Frontend

- React 19
- Vite 8
- React Router
- Redux Toolkit + React Redux
- Ant Design
- Axios
- Chart.js + react-chartjs-2

### Backend

- Node.js 20
- Express
- Mongoose
- JWT (jsonwebtoken)
- bcrypt
- express-validator
- multer (upload)
- nodemailer
- google-auth-library
- vnpay
- helmet + cors

### DevOps

- Docker + Docker Compose
- Nginx (frontend container)
- GitHub Actions (build, test, lint, deploy)
- Docker Hub (registry)

## Cau Truc Thu Muc

```text
.
|-- Backend/
|   |-- app.js
|   |-- routes/
|   |-- schemas/
|   |-- controllers/
|   |-- utils/
|   |-- tests/
|   `-- Dockerfile
|-- frontend/
|   |-- src/
|   |   |-- pages/
|   |   |-- components/
|   |   |-- store/
|   |   `-- utils/
|   |-- nginx.conf
|   `-- Dockerfile
|-- docker-compose.prod.yml
|-- .env.production.example
|-- CI_CD_SETUP.md
`-- .github/workflows/deploy.yml
```

## API Backend

Base URL backend: /api/v1

Nhom route chinh:

- /auth: register, login, me, logout, forgot/reset password, google config/login.
- /users: cap nhat profile, quan ly user (admin/moderator).
- /products: danh sach, tim kiem, chi tiet, related, CRUD (admin).
- /categories: danh sach, chi tiet, san pham theo danh muc, CRUD (admin).
- /carts: quan ly gio hang cua user dang nhap.
- /orders: tao don, danh sach don cua toi, chi tiet don, admin quan ly tat ca.
- /vnpay: tao payment URL, return, IPN.
- /vouchers: validate ma giam gia, CRUD voucher (admin).
- /wishlists: xem/them/xoa wishlist.
- /reviews: danh sach danh gia theo san pham, tao/xoa danh gia.
- /returns: tao yeu cau tra hang, xem cua toi, admin review.
- /dashboard: thong ke tong hop cho admin.
- /inventories: ton kho va log dieu chinh kho.
- /upload: upload anh, avatar, excel.
- /roles: CRUD role (admin).

## Bien Moi Truong

Tham khao mau day du trong .env.production.example.

| Bien | Bat buoc | Mo ta |
|---|---|---|
| MONGODB_URI | Co | Chuoi ket noi MongoDB |
| CORS_ORIGIN | Co | Danh sach origin duoc phep, ngan cach boi dau phay |
| FRONTEND_URL | Co | URL frontend, vi du https://minishopecommerce.click/shop |
| JWT_SECRET | Co | Secret ky token JWT |
| COOKIE_SECURE | Khuyen nghi | true/false cho cookie secure |
| COOKIE_SAME_SITE | Khuyen nghi | lax/strict/none |
| GOOGLE_CLIENT_ID | De bat Google Login | OAuth Client ID cho web |
| SMTP_HOST | Tuy chon | Mail server |
| SMTP_PORT | Tuy chon | Cong SMTP |
| SMTP_SECURE | Tuy chon | true/false |
| SMTP_USER | Tuy chon | Tai khoan gui mail |
| SMTP_PASS | Tuy chon | Mat khau/app password SMTP |
| MAIL_FROM | Tuy chon | Dia chi nguoi gui |
| VNP_TMN_CODE | Tuy chon | Ma merchant VNPay |
| VNP_HASH_SECRET | Tuy chon | Secret VNPay |
| VNP_URL | Tuy chon | Endpoint VNPay |
| VNP_RETURN_URL | Tuy chon | URL return tren frontend |

Luu y:

- Backend doc bien moi truong truc tiep tu process.env.
- Khi chay local, can set env trong shell, hoac chay qua Docker Compose.

## Huong Dan Chay Local

### 1) Yeu cau

- Node.js 20+
- MongoDB dang chay local hoac remote

### 2) Chay Backend

```bash
cd Backend
npm install
npm start
```

Backend mac dinh chay cong 3000.

Trong moi truong dev, app co fallback ket noi den cac URI local sau:

- mongodb://127.0.0.1:27019/nodejs?directConnection=true
- mongodb://127.0.0.1:27017/nodejs?directConnection=true
- mongodb://127.0.0.1:27018/nodejs?directConnection=true
- mongodb://localhost:27017/nodejs

Neu muon bat Google Login local, them it nhat bien:

```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
CORS_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173/shop
```

### 3) Chay Frontend

```bash
cd frontend
npm install
npm run dev
```

Truy cap local:

- http://localhost:5173/shop

Frontend da cau hinh proxy:

- /shop/api -> http://localhost:3000/api
- /api -> http://localhost:3000/api

## Trien Khai Docker Production

File lien quan:

- docker-compose.prod.yml
- .env.production.example
- Backend/Dockerfile
- frontend/Dockerfile
- frontend/nginx.conf

Quy trinh co ban tren server:

```bash
cp .env.production.example .env.production
# sua gia tri that trong .env.production

docker compose -f docker-compose.prod.yml --env-file .env.production pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --remove-orphans
```

Mac dinh frontend duoc expose qua cong 8081 trong compose (8081:80).

## CI/CD GitHub Actions

Workflow: .github/workflows/deploy.yml

Moi lan push len nhanh main:

1. Chay quality-check:
   - npm ci + test cho backend
   - npm ci + lint + build cho frontend
2. Build image backend/frontend va push len Docker Hub.
3. SSH vao server, pull source moi nhat.
4. Tao .env.production tu GitHub secret SERVER_ENV_FILE.
5. Docker compose pull + up -d de cap nhat he thong.

Secrets quan trong can tao tren GitHub:

- DOCKERHUB_USERNAME
- DOCKERHUB_TOKEN
- SSH_HOST
- SSH_USER
- SSH_PRIVATE_KEY
- SERVER_APP_PATH
- SERVER_ENV_FILE

## Kiem Thu

### Backend test

```bash
cd Backend
npm test
```

### Frontend lint + build

```bash
cd frontend
npm run lint
npm run build
```

## Google Login Checklist

Neu trang login hien thong bao "Dang nhap Google chua duoc cau hinh tren he thong", kiem tra theo thu tu:

1. Da set GOOGLE_CLIENT_ID trong SERVER_ENV_FILE.
2. docker-compose.prod.yml co map GOOGLE_CLIENT_ID vao service backend.
3. Da deploy lai service backend sau khi cap nhat secret.
4. Endpoint /api/v1/auth/google/config tra enabled = true.
5. Google Cloud Console da them Authorized JavaScript origins dung voi domain thuc te:
   - https://minishopecommerce.click
   - http://localhost:5173 (cho local)

## Su Co Thuong Gap

### 1) Trang trang hoac route sai sau deploy

- Dam bao truy cap app qua /shop.
- Kiem tra Vite base la /shop/ va BrowserRouter basename la /shop.

### 2) Loi CORS

- CORS_ORIGIN phai dung origin that dang truy cap.
- Co the set nhieu origin bang dau phay.

### 3) Khong ket noi duoc MongoDB

- Kiem tra MONGODB_URI.
- Kiem tra firewall/network giua container backend va Mongo host.

### 4) Google button khong hien

- Kiem tra endpoint /api/v1/auth/google/config.
- Kiem tra GOOGLE_CLIENT_ID va deploy lai.

## Ghi Chu Bao Mat

- Khong commit JWT_SECRET, SMTP_PASS, VNP_HASH_SECRET vao git.
- Neu lo thong tin nhay cam, can rotate secret ngay lap tuc.
- Uu tien HTTPS cho production va set COOKIE_SECURE=true.

## Tai Lieu Lien Quan

- Huong dan CI/CD chi tiet: CI_CD_SETUP.md
- Mau env production: .env.production.example
- Workflow deploy: .github/workflows/deploy.yml
