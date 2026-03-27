import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Card, Typography, Table, Tag, Spin, Button, Breadcrumb, Divider, Descriptions } from 'antd';
import { HomeOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import api from '../utils/api';

const { Title, Text } = Typography;
const statusColors = { Pending: 'orange', Paid: 'blue', Shipped: 'cyan', Delivered: 'green', Cancelled: 'red' };
const statusLabels = { Pending: 'Chờ xử lý', Paid: 'Đã thanh toán', Shipped: 'Đang giao', Delivered: 'Đã giao', Cancelled: 'Đã hủy' };

export default function OrderDetailPage() {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        api.get(`/orders/${id}`).then(res => setData(res.data))
            .catch(() => navigate('/orders'))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
    if (!data) return null;

    const { order, payment } = data;

    const columns = [
        {
            title: 'Sản phẩm', dataIndex: 'product', key: 'product',
            render: p => <span style={{ fontWeight: 500 }}>{p?.title || 'N/A'}</span>
        },
        { title: 'Đơn giá', dataIndex: 'priceAtPurchase', render: p => `${p?.toLocaleString('vi-VN')}đ` },
        { title: 'SL', dataIndex: 'quantity', align: 'center' },
        { title: 'Thành tiền', dataIndex: 'subtotal', render: s => <Text strong style={{ color: '#e74c3c' }}>{s?.toLocaleString('vi-VN')}đ</Text> }
    ];

    return (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/orders')} style={{ marginBottom: 16 }}>Quay lại</Button>
            <Card style={{ borderRadius: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Title level={4} style={{ margin: 0 }}>Đơn hàng #{order._id.slice(-8)}</Title>
                    <Tag color={statusColors[order.status]} style={{ fontSize: 14, padding: '4px 12px' }}>{statusLabels[order.status]}</Tag>
                </div>
                <Descriptions size="small" column={2}>
                    <Descriptions.Item label="Ngày đặt">{new Date(order.createdAt).toLocaleString('vi-VN')}</Descriptions.Item>
                    <Descriptions.Item label="Thanh toán">{order.paymentMethod}</Descriptions.Item>
                    <Descriptions.Item label="Địa chỉ">{order.shippingAddress || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Ghi chú">{order.note || 'Không'}</Descriptions.Item>
                    {payment && <Descriptions.Item label="TT thanh toán"><Tag color={payment.status === 'paid' ? 'green' : 'orange'}>{payment.status}</Tag></Descriptions.Item>}
                </Descriptions>
                <Divider />
                <Table dataSource={order.items} columns={columns} pagination={false} rowKey={(r, i) => i} />
                <div style={{ textAlign: 'right', marginTop: 16, padding: 16, background: '#f0fdf4', borderRadius: 8 }}>
                    <Title level={3} style={{ margin: 0, color: '#16a34a' }}>Tổng: {order.totalPrice?.toLocaleString('vi-VN')}đ</Title>
                </div>
            </Card>
        </div>
    );
}
