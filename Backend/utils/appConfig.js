const crypto = require('crypto');

const isProduction = process.env.NODE_ENV === 'production';

const devJwtSecret = crypto.randomBytes(32).toString('hex');
const jwtSecret = process.env.JWT_SECRET || (isProduction ? '' : devJwtSecret);

if (!jwtSecret) {
    throw new Error('JWT_SECRET is required in production environment');
}

const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173/shop').replace(/\/$/, '');

const cookieSecure = process.env.COOKIE_SECURE
    ? process.env.COOKIE_SECURE.toLowerCase() === 'true'
    : isProduction;

const cookieSameSite = (process.env.COOKIE_SAME_SITE || (isProduction ? 'none' : 'lax')).toLowerCase();

const mailConfig = {
    host: process.env.SMTP_HOST || '',
    port: Number.parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE.toLowerCase() === 'true' : false,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'no-reply@minishop.local'
};

const vnpayConfig = {
    tmnCode: process.env.VNP_TMN_CODE || '',
    hashSecret: process.env.VNP_HASH_SECRET || '',
    url: process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    returnUrl: process.env.VNP_RETURN_URL || `${frontendUrl}/vnpay-return`
};

module.exports = {
    isProduction,
    jwtSecret,
    frontendUrl,
    cookieSecure,
    cookieSameSite,
    mailConfig,
    vnpayConfig
};