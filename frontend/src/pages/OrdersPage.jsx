import { Table, Tag, Typography, Card, Button, Space, Empty } from 'antd';
import { EyeOutlined, ShoppingOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../utils/api';

const { Title } = Typography;

const statusColors = {
    Pending: 'default', Paid: 'processing', Shipped: 'processing', Delivered: 'success', Cancelled: 'error'
};
const statusLabels = {
    Pending: 'Chờ xử lý', Paid: 'Đã thanh toán', Shipped: 'Đang giao', Delivered: 'Đã giao', Cancelled: 'Đã hủy'
};

export default function OrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);

    const handlePageChange = (nextPage) => {
        setLoading(true);
        setPage(nextPage);
    };

    useEffect(() => {
        let cancelled = false;

        api.get('/orders', { params: { page, limit: 10 } })
            .then((res) => {
                if (cancelled) {
                    return;
                }
                setOrders(res.data.orders || []);
                setTotal(res.data.total || 0);
            })
            .catch(() => {
                if (cancelled) {
                    return;
                }
                setOrders([]);
                setTotal(0);
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [page]);

    const columns = [
        {
            title: 'Mã đơn', dataIndex: '_id', key: 'id',
            render: id => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>#{id.slice(-8)}</span>
        },
        {
            title: 'Ngày đặt', dataIndex: 'createdAt', key: 'date',
            render: d => new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        },
        {
            title: 'Sản phẩm', dataIndex: 'items', key: 'items',
            render: items => `${items.length} sản phẩm`
        },
        {
            title: 'Tổng tiền', dataIndex: 'totalPrice', key: 'total',
            render: price => <span style={{ fontWeight: 600, color: '#e74c3c' }}>{price?.toLocaleString('vi-VN')}đ</span>
        },
        {
            title: 'Thanh toán', dataIndex: 'paymentMethod', key: 'payment'
        },
        {
            title: 'Trạng thái', dataIndex: 'status', key: 'status',
            render: s => <Tag color={statusColors[s]}>{statusLabels[s] || s}</Tag>
        },
        {
            title: '', key: 'action',
            render: (_, record) => <Link to={`/orders/${record._id}`}><Button size="small" icon={<EyeOutlined />}>Chi tiết</Button></Link>
        }
    ];

    return (
        <section className="page-container" style={{ maxWidth: 1040 }} aria-label="Đơn hàng của tôi">
            <Title level={3}>📦 Đơn hàng của tôi</Title>
            {orders.length === 0 && !loading ? (
                <Card className="surface-card" style={{ textAlign: 'center', borderRadius: 12, padding: 40 }}>
                    <Empty description="Chưa có đơn hàng nào" />
                    <Link to="/products"><Button type="primary" icon={<ShoppingOutlined />} style={{ marginTop: 16, borderRadius: 8 }}>Mua sắm ngay</Button></Link>
                </Card>
            ) : (
                <Card className="surface-card" style={{ borderRadius: 12 }}>
                    <Table dataSource={orders} columns={columns} loading={loading}
                        rowKey="_id" pagination={{ total, current: page, pageSize: 10, onChange: handlePageChange }} />
                </Card>
            )}
        </section>
    );
}
