# CI/CD setup for MiniShop

This project is configured so that every push to main will:

1. Build Docker images for backend and frontend.
2. Push both images to Docker Hub.
3. Connect to your server via SSH.
4. Pull latest images and restart containers with Docker Compose.

## Files added

- .github/workflows/deploy.yml
- docker-compose.prod.yml
- .env.production.example
- Backend/Dockerfile
- Backend/.dockerignore
- frontend/Dockerfile
- frontend/.dockerignore
- frontend/nginx.conf

## 1) Required GitHub Secrets

Add these secrets in your repository settings:

- DOCKERHUB_USERNAME: your Docker Hub username
- DOCKERHUB_TOKEN: Docker Hub access token
- SSH_HOST: server IP/domain
- SSH_USER: SSH username
- SSH_PRIVATE_KEY: private key content used to connect to server
- SERVER_APP_PATH: path on server where repo exists, example /opt/minishop
- SERVER_ENV_FILE: full content of .env.production

The SERVER_ENV_FILE must now include all application env vars used by backend auth/payment/mail:

- MONGODB_URI
- CORS_ORIGIN
- FRONTEND_URL
- JWT_SECRET
- COOKIE_SECURE
- COOKIE_SAME_SITE
- SMTP_HOST
- SMTP_PORT
- SMTP_SECURE
- SMTP_USER
- SMTP_PASS
- MAIL_FROM
- VNP_TMN_CODE
- VNP_HASH_SECRET
- VNP_URL
- VNP_RETURN_URL

Example SERVER_ENV_FILE value:

DOCKERHUB_USERNAME=your-dockerhub-username
MONGODB_URI=mongodb://your-mongo-host:27017/NNPTUD-S3
CORS_ORIGIN=https://your-domain.com
FRONTEND_URL=https://your-domain.com/shop
JWT_SECRET=replace-with-a-strong-random-secret
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
MAIL_FROM=no-reply@your-domain.com
VNP_TMN_CODE=your-vnpay-tmn-code
VNP_HASH_SECRET=your-vnpay-hash-secret
VNP_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNP_RETURN_URL=https://your-domain.com/shop/vnpay-return

## 2) One-time server bootstrap

Run these commands on server once:

~~~bash
sudo mkdir -p /opt/minishop
sudo chown -R $USER:$USER /opt/minishop
git clone <your-repo-url> /opt/minishop
cd /opt/minishop
cp .env.production.example .env.production
# edit .env.production with real values
~~~

Make sure Docker and Docker Compose are installed on server.

## 3) Deploy flow

After setup, every push to main triggers workflow deploy.yml.

The deploy job runs:

~~~bash
git checkout main
git pull --ff-only origin main
printf '%s\n' "$SERVER_ENV_FILE" > .env.production
docker compose -f docker-compose.prod.yml --env-file .env.production pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --remove-orphans
~~~

## 4) Domain and HTTPS

Current compose maps frontend container to port 80.
For production, put Nginx/Caddy/Traefik in front and enable HTTPS.

## 5) Rollback (manual)

If needed, redeploy an older image tag by setting IMAGE_TAG in server env and re-running compose up:

~~~bash
cd /opt/minishop
export IMAGE_TAG=<old_commit_sha>
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
~~~
