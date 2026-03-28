import { Table, Tag, Select, message, Card, Typography, Button } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';

const { Title } = Typography;
const statusColors = { Pending: 'orange', Paid: 'blue', Shipped: 'cyan', Delivered: 'green', Cancelled: 'red' };
const statusLabels = { Pending: 'Chờ xử lý', Paid: 'Đã thanh toán', Shipped: 'Đang giao', Delivered: 'Đã giao', Cancelled: 'Đã hủy' };
const afterSaleColors = { None: 'default', Requested: 'orange', Approved: 'blue', Rejected: 'red', Refunded: 'green' };
const orderStatusTransitions = {
    Pending: ['Paid', 'Shipped', 'Cancelled'],
    Paid: ['Shipped', 'Cancelled'],
    Shipped: ['Delivered'],
    Delivered: [],
    Cancelled: []
};

function getAllowedStatusOptions(order) {
    let nextStatuses = orderStatusTransitions[order.status] || [];

    if (order.paymentMethod === 'VNPay' && order.status === 'Pending') {
        nextStatuses = nextStatuses.filter((item) => item !== 'Shipped');
    }

    return [order.status, ...nextStatuses];
}

export default function OrdersManagePage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState('');

    const fetchOrders = useCallback(() => {
        setLoading(true);
        const params = { page, limit: 10 };
        if (statusFilter) params.status = statusFilter;
        api.get('/orders/admin/all', { params })
            .then(res => { setOrders(res.data.orders || []); setTotal(res.data.total || 0); })
            .finally(() => setLoading(false));
    }, [page, statusFilter]);

    useEffect(() => {
        let cancelled = false;
        const params = { page, limit: 10 };
        if (statusFilter) params.status = statusFilter;

        api.get('/orders/admin/all', { params })
            .then((res) => {
                if (cancelled) {
                    return;
                }
                setOrders(res.data.orders || []);
                setTotal(res.data.total || 0);
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [page, statusFilter]);

    const handlePageChange = (nextPage) => {
        setLoading(true);
        setPage(nextPage);
    };

    const handleStatusFilterChange = (value) => {
        setLoading(true);
        setStatusFilter(value || '');
        setPage(1);
    };

    const handleStatusChange = async (orderId, newStatus) => {
        try {
            await api.put(`/orders/${orderId}/status`, { status: newStatus });
            message.success('Cập nhật trạng thái thành công');
            fetchOrders();
        } catch (err) {
            message.error(err.response?.data?.message || 'Lỗi cập nhật');
        }
    };

    const columns = [
        { title: 'Mã', dataIndex: '_id', width: 100, render: id => <span style={{ fontFamily: 'monospace', fontSize: 11 }}>#{id.slice(-8)}</span> },
        { title: 'Khách hàng', dataIndex: 'user', render: u => u?.username || 'N/A' },
        { title: 'Email', dataIndex: 'user', key: 'email', render: u => u?.email || 'N/A', ellipsis: true },
        { title: 'SP', dataIndex: 'items', width: 50, align: 'center', render: items => items?.length },
        { title: 'Tổng', dataIndex: 'totalPrice', width: 120, render: p => <span style={{ fontWeight: 600, color: '#e74c3c' }}>{p?.toLocaleString('vi-VN')}đ</span> },
        { title: 'TT', dataIndex: 'paymentMethod', width: 70 },
        {
            title: 'Trạng thái', dataIndex: 'status', width: 160,
            render: (status, record) => {
                let allowedOptions = getAllowedStatusOptions(record);
                return (
                <Select value={status} size="small" style={{ width: 140 }}
                    disabled={allowedOptions.length <= 1}
                    onChange={(v) => handleStatusChange(record._id, v)}>
                    {allowedOptions.map(s => (
                        <Select.Option key={s} value={s}><Tag color={statusColors[s]}>{statusLabels[s]}</Tag></Select.Option>
                    ))}
                </Select>
            )
            }
        },
        {
            title: 'Hau mai', dataIndex: 'afterSaleStatus', width: 110,
            render: (status) => <Tag color={afterSaleColors[status || 'None']}>{status || 'None'}</Tag>
        },
        { title: 'Ngày', dataIndex: 'createdAt', width: 100, render: d => new Date(d).toLocaleDateString('vi-VN') },
        {
            title: '', width: 50,
            render: (_, r) => <Link to={`/orders/${r._id}`}><Button size="small" icon={<EyeOutlined />} /></Link>
        }
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>Quản lý đơn hàng</Title>
                <Select placeholder="Lọc trạng thái" allowClear style={{ width: 160 }}
                    value={statusFilter || undefined} onChange={handleStatusFilterChange}>
                    {Object.keys(statusLabels).map(s => <Select.Option key={s} value={s}>{statusLabels[s]}</Select.Option>)}
                </Select>
            </div>
            <Card style={{ borderRadius: 12 }}>
                <Table dataSource={orders} columns={columns} loading={loading} rowKey="_id" size="small"
                    pagination={{ total, current: page, pageSize: 10, onChange: handlePageChange }} />
            </Card>
        </div>
    );
}
