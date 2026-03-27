import { Card, Button, Radio, Input, Typography, Divider, List, message } from 'antd';
import { CreditCardOutlined, DollarOutlined } from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearCart, fetchCart } from '../store/slices/cartSlice';
import api from '../utils/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function CheckoutPage() {
    const { items } = useSelector(state => state.cart);
    const { user } = useSelector(state => state.auth);
    const [paymentMethod, setPaymentMethod] = useState('COD');
    const [shippingAddress, setShippingAddress] = useState('');
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            dispatch(fetchCart());
        }
    }, [dispatch, user]);

    const total = items.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0);

    const handlePlaceOrder = async () => {
        if (!shippingAddress.trim()) {
            message.error('Vui lòng nhập địa chỉ giao hàng');
            return;
        }
        setLoading(true);
        try {
            const res = await api.post('/orders', { paymentMethod, shippingAddress, note });
            dispatch(clearCart());
            await dispatch(fetchCart());

            if (paymentMethod === 'VNPay') {
                // Get VNPay payment URL
                const payRes = await api.post('/vnpay/create-payment-url', { orderId: res.data.order._id });
                window.location.href = payRes.data.paymentUrl;
            } else {
                message.success('Đặt hàng thành công!');
                navigate('/orders');
            }
        } catch (err) {
            message.error(err.response?.data?.message || 'Đặt hàng thất bại');
        }
        setLoading(false);
    };

    if (items.length === 0) {
        navigate('/cart');
        return null;
    }

    return (
        <section className="page-container" style={{ maxWidth: 920 }} aria-label="Thanh toán">
            <Title level={3}>💳 Thanh toán</Title>

            <div className="checkout-grid">
                <div>
                    <Card title="Thông tin giao hàng" className="surface-card" style={{ borderRadius: 12, marginBottom: 16 }}>
                        <div style={{ marginBottom: 12 }}>
                            <Text strong>Người nhận:</Text> {user?.fullName || user?.username}
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <Text strong>Email:</Text> {user?.email}
                        </div>
                        <div style={{ marginBottom: 8 }}>
                            <Text strong>Địa chỉ giao hàng *</Text>
                        </div>
                        <Input placeholder="Nhập địa chỉ giao hàng" value={shippingAddress}
                            onChange={e => setShippingAddress(e.target.value)} />
                        <div style={{ marginTop: 12, marginBottom: 8 }}>
                            <Text strong>Ghi chú</Text>
                        </div>
                        <TextArea rows={3} placeholder="Ghi chú cho đơn hàng (tùy chọn)" value={note}
                            onChange={e => setNote(e.target.value)} />
                    </Card>

                    <Card title="Phương thức thanh toán" className="surface-card" style={{ borderRadius: 12 }}>
                        <Radio.Group value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <Radio value="COD" style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
                                <DollarOutlined style={{ marginRight: 8 }} /> Thanh toán khi nhận hàng (COD)
                            </Radio>
                            <Radio value="VNPay" style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
                                <CreditCardOutlined style={{ marginRight: 8 }} /> Thanh toán qua VNPay
                            </Radio>
                        </Radio.Group>
                    </Card>
                </div>

                <div className="checkout-grid__summary">
                    <Card title="Đơn hàng" className="surface-card" style={{ borderRadius: 12 }}>
                        <List
                            dataSource={items}
                            renderItem={item => (
                                <List.Item style={{ padding: '8px 0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                        <Text ellipsis style={{ maxWidth: 160 }}>{item.product?.title}</Text>
                                        <Text>x{item.quantity}</Text>
                                    </div>
                                </List.Item>
                            )}
                        />
                        <Divider style={{ margin: '8px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Title level={4} style={{ margin: 0 }}>Tổng</Title>
                            <Title level={4} style={{ margin: 0, color: '#e74c3c' }}>
                                {total.toLocaleString('vi-VN')}đ
                            </Title>
                        </div>
                        <Button type="primary" size="large" block loading={loading}
                            onClick={handlePlaceOrder}
                            style={{
                                marginTop: 16, height: 48, borderRadius: 10, fontWeight: 700
                            }}>
                            {paymentMethod === 'VNPay' ? 'Thanh toán VNPay' : 'Đặt hàng'}
                        </Button>
                    </Card>
                </div>
            </div>
        </section>
    );
}
