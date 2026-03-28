const nodemailer = require("nodemailer");
const { isProduction, mailConfig } = require('./appConfig');

let transporter = null;

function getTransporter() {
    if (transporter) {
        return transporter;
    }

    if (!mailConfig.host || !mailConfig.user || !mailConfig.pass) {
        return null;
    }

    transporter = nodemailer.createTransport({
        host: mailConfig.host,
        port: mailConfig.port,
        secure: mailConfig.secure,
        auth: {
            user: mailConfig.user,
            pass: mailConfig.pass
        }
    });

    return transporter;
}

async function safeSendMail(payload) {
    let client = getTransporter();

    if (!client) {
        if (isProduction) {
            throw new Error('SMTP is not configured for production');
        }

        return { skipped: true };
    }

    return await client.sendMail(payload);
}

function buildAccountPasswordTemplate(username, password) {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
            <div style="background: #0f766e; color: #fff; padding: 16px 20px;">
                <h2 style="margin: 0; font-size: 20px;">Tao tai khoan thanh cong</h2>
            </div>
            <div style="padding: 20px; color: #111827; line-height: 1.6;">
                <p style="margin: 0 0 12px 0;">Xin chao <strong>${username}</strong>,</p>
                <p style="margin: 0 0 12px 0;">Tai khoan cua ban da duoc tao tu he thong import.</p>
                <p style="margin: 0 0 8px 0;"><strong>Mat khau tam thoi:</strong> <span style="font-family: monospace; background: #f3f4f6; padding: 4px 8px; border-radius: 6px;">${password}</span></p>
                <p style="margin: 0;">Vui long dang nhap va doi mat khau ngay sau lan dang nhap dau tien.</p>
            </div>
        </div>
    `;
}

function buildOrderConfirmationTemplate(order) {
    let itemsHtml = order.items.map(item => {
        let productName = item.product?.title || 'Sản phẩm';
        return `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${productName}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.priceAtPurchase.toLocaleString('vi-VN')}đ</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.subtotal.toLocaleString('vi-VN')}đ</td>
            </tr>
        `;
    }).join('');

    return `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; padding: 24px 20px; text-align: center;">
                <h2 style="margin: 0; font-size: 22px;">🛒 Xác nhận đơn hàng</h2>
                <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">Mã đơn: #${order._id}</p>
            </div>
            <div style="padding: 20px; color: #111827;">
                <p style="margin: 0 0 16px;">Cảm ơn bạn đã đặt hàng! Dưới đây là chi tiết đơn hàng:</p>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
                    <thead>
                        <tr style="background: #f9fafb;">
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Sản phẩm</th>
                            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e5e7eb;">SL</th>
                            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb;">Đơn giá</th>
                            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb;">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
                <div style="text-align: right; padding: 12px; background: #f0fdf4; border-radius: 8px; margin-bottom: 16px;">
                    <span style="font-size: 18px; font-weight: bold; color: #16a34a;">
                        Tổng cộng: ${order.totalPrice.toLocaleString('vi-VN')}đ
                    </span>
                </div>
                <div style="padding: 12px; background: #f9fafb; border-radius: 8px;">
                    <p style="margin: 0 0 4px;"><strong>Phương thức:</strong> ${order.paymentMethod}</p>
                    <p style="margin: 0 0 4px;"><strong>Trạng thái:</strong> ${order.status}</p>
                    ${order.shippingAddress ? `<p style="margin: 0;"><strong>Địa chỉ:</strong> ${order.shippingAddress}</p>` : ''}
                </div>
            </div>
            <div style="background: #f9fafb; padding: 12px 20px; text-align: center; color: #6b7280; font-size: 12px;">
                Mini E-commerce Hub — Cảm ơn bạn đã mua sắm!
            </div>
        </div>
    `;
}

module.exports = {
    sendMail: async (to, url) => {
        await safeSendMail({
            from: mailConfig.from,
            to: to,
            subject: "request resetpassword email",
            text: "click vao day de reset",
            html: "click vao <a href=" + url + ">day</a> de reset",
        });
    },
    sendAccountPasswordMail: async (to, username, password) => {
        await safeSendMail({
            from: mailConfig.from,
            to: to,
            subject: "Tai khoan moi cua ban",
            text: `Tai khoan ${username} da duoc tao. Mat khau tam thoi: ${password}`,
            html: buildAccountPasswordTemplate(username, password),
        });
    },
    sendOrderConfirmationMail: async (to, order) => {
        await safeSendMail({
            from: mailConfig.from,
            to: to,
            subject: `Xác nhận đơn hàng #${order._id}`,
            text: `Đơn hàng #${order._id} đã được đặt thành công. Tổng: ${order.totalPrice.toLocaleString('vi-VN')}đ`,
            html: buildOrderConfirmationTemplate(order),
        });
    }
};