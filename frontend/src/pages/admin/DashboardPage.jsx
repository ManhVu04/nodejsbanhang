import { Card, Row, Col, Statistic, Typography, Table, Tag, Spin } from 'antd';
import { DollarOutlined, ShoppingCartOutlined, UserOutlined, InboxOutlined, RiseOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title as ChartTitle, Tooltip, Legend } from 'chart.js';
import api from '../../utils/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, ChartTitle, Tooltip, Legend);

const { Title } = Typography;

export default function DashboardPage() {
    const [summary, setSummary] = useState(null);
    const [revenue, setRevenue] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [orderStats, setOrderStats] = useState({});
    const [recentOrders, setRecentOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            api.get('/dashboard/summary'),
            api.get('/dashboard/revenue?period=day'),
            api.get('/dashboard/top-products?limit=5'),
            api.get('/dashboard/order-stats'),
            api.get('/dashboard/recent-orders')
        ]).then(([s, r, t, os, ro]) => {
            setSummary(s.data);
            setRevenue(r.data);
            setTopProducts(t.data);
            setOrderStats(os.data);
            setRecentOrders(ro.data);
        }).catch(() => {}).finally(() => setLoading(false));
    }, []);

    if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;

    const revenueChartData = {
        labels: revenue.map(r => r._id),
        datasets: [{
            label: 'Doanh thu (VNĐ)',
            data: revenue.map(r => r.revenue),
            backgroundColor: 'rgba(102, 126, 234, 0.7)',
            borderColor: '#667eea',
            borderWidth: 1,
            borderRadius: 6
        }]
    };

    const orderStatsData = {
        labels: Object.keys(orderStats),
        datasets: [{
            data: Object.values(orderStats),
            backgroundColor: ['#faad14', '#1890ff', '#13c2c2', '#52c41a', '#ff4d4f'],
            borderWidth: 0
        }]
    };

    const statusColors = { Pending: 'orange', Paid: 'blue', Shipped: 'cyan', Delivered: 'green', Cancelled: 'red' };

    return (
        <div>
            <Title level={3}>📊 Dashboard</Title>

            {/* Summary Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} md={6}>
                    <Card style={{ borderRadius: 12, background: 'linear-gradient(135deg, #667eea, #764ba2)' }} bodyStyle={{ padding: 20 }}>
                        <Statistic title={<span style={{ color: 'rgba(255,255,255,0.8)' }}>Doanh thu</span>}
                            value={summary?.totalRevenue || 0} suffix="đ"
                            valueStyle={{ color: '#fff', fontWeight: 700 }}
                            prefix={<DollarOutlined />}
                            formatter={(v) => Number(v).toLocaleString('vi-VN')} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card style={{ borderRadius: 12, background: 'linear-gradient(135deg, #f093fb, #f5576c)' }} bodyStyle={{ padding: 20 }}>
                        <Statistic title={<span style={{ color: 'rgba(255,255,255,0.8)' }}>Đơn hàng</span>}
                            value={summary?.totalOrders || 0}
                            valueStyle={{ color: '#fff', fontWeight: 700 }}
                            prefix={<ShoppingCartOutlined />} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card style={{ borderRadius: 12, background: 'linear-gradient(135deg, #4facfe, #00f2fe)' }} bodyStyle={{ padding: 20 }}>
                        <Statistic title={<span style={{ color: 'rgba(255,255,255,0.8)' }}>Khách hàng</span>}
                            value={summary?.totalCustomers || 0}
                            valueStyle={{ color: '#fff', fontWeight: 700 }}
                            prefix={<UserOutlined />} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card style={{ borderRadius: 12, background: 'linear-gradient(135deg, #43e97b, #38f9d7)' }} bodyStyle={{ padding: 20 }}>
                        <Statistic title={<span style={{ color: 'rgba(255,255,255,0.8)' }}>Sản phẩm</span>}
                            value={summary?.totalProducts || 0}
                            valueStyle={{ color: '#fff', fontWeight: 700 }}
                            prefix={<InboxOutlined />} />
                    </Card>
                </Col>
            </Row>

            {/* Charts */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} lg={16}>
                    <Card title="📈 Doanh thu theo ngày" style={{ borderRadius: 12 }}>
                        <Bar data={revenueChartData} options={{
                            responsive: true,
                            plugins: { legend: { display: false } },
                            scales: { y: { beginAtZero: true } }
                        }} />
                    </Card>
                </Col>
                <Col xs={24} lg={8}>
                    <Card title="📊 Phân bổ đơn hàng" style={{ borderRadius: 12 }}>
                        <Doughnut data={orderStatsData} options={{
                            responsive: true,
                            plugins: { legend: { position: 'bottom' } }
                        }} />
                    </Card>
                </Col>
            </Row>

            {/* Top Products & Recent Orders */}
            <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                    <Card title="🏆 Top sản phẩm bán chạy" style={{ borderRadius: 12 }}>
                        <Table dataSource={topProducts} pagination={false} rowKey={(r) => r._id} size="small"
                            columns={[
                                { title: 'Sản phẩm', render: (_, r) => r.product?.title || 'N/A' },
                                { title: 'Đã bán', dataIndex: 'soldCount', align: 'center', render: v => <Tag color="green">{v}</Tag> },
                                { title: 'Tồn kho', dataIndex: 'stock', align: 'center', render: v => <Tag color={v > 0 ? 'blue' : 'red'}>{v}</Tag> }
                            ]}
                        />
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card title="🕐 Đơn hàng gần đây" style={{ borderRadius: 12 }}>
                        <Table dataSource={recentOrders} pagination={false} rowKey="_id" size="small"
                            columns={[
                                { title: 'Mã', dataIndex: '_id', render: id => `#${id.slice(-6)}` },
                                { title: 'Khách', dataIndex: 'user', render: u => u?.username || 'N/A' },
                                { title: 'Tổng', dataIndex: 'totalPrice', render: p => `${p?.toLocaleString('vi-VN')}đ` },
                                { title: 'TT', dataIndex: 'status', render: s => <Tag color={statusColors[s]} style={{ fontSize: 11 }}>{s}</Tag> }
                            ]}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
