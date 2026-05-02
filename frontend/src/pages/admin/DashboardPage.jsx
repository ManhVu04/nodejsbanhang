import { Card, Row, Col, Table, Tag, Spin, Avatar } from 'antd';
import {
    DollarOutlined, ShoppingCartOutlined, UserOutlined, InboxOutlined,
    RollbackOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS, CategoryScale, LinearScale, LineElement, PointElement,
    ArcElement, Title as ChartTitle, Tooltip, Legend, Filler,
} from 'chart.js';
import api from '../../utils/api';
import AdminStatCard from '../../components/admin/AdminStatCard';
import { orderStatusColors } from '../../components/admin/statusColors';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, ArcElement, ChartTitle, Tooltip, Legend, Filler);

export default function DashboardPage() {
    const [summary, setSummary] = useState(null);
    const [revenue, setRevenue] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [orderStats, setOrderStats] = useState({});
    const [recentOrders, setRecentOrders] = useState([]);
    const [lowStock, setLowStock] = useState([]);
    const [recentUsers, setRecentUsers] = useState([]);
    const [pendingReturns, setPendingReturns] = useState(0);
    const [refundedReturns, setRefundedReturns] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            api.get('/dashboard/summary'),
            api.get('/dashboard/revenue?period=day'),
            api.get('/dashboard/top-products?limit=5'),
            api.get('/dashboard/order-stats'),
            api.get('/dashboard/recent-orders'),
            api.get('/dashboard/low-stock?threshold=5&limit=5'),
            api.get('/users?limit=5&sort=-createdAt'),
            api.get('/returns/admin/all?status=Requested&limit=1'),
            api.get('/returns/admin/all?status=Refunded&limit=1'),
        ]).then(([s, r, t, os, ro, inv, users, pendRet, refRet]) => {
            setSummary(s.data);
            setRevenue(r.data);
            setTopProducts(t.data);
            setOrderStats(os.data);
            setRecentOrders(ro.data);

            setLowStock(Array.isArray(inv.data) ? inv.data : []);

            const allUsers = Array.isArray(users.data?.users) ? users.data.users : [];
            setRecentUsers(allUsers);

            setPendingReturns(pendRet.data?.total || 0);
            setRefundedReturns(refRet.data?.total || 0);
        }).catch(() => {}).finally(() => setLoading(false));
    }, []);

    if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;

    const revenueChartData = {
        labels: revenue.map((r) => r._id),
        datasets: [{
            label: 'Doanh thu (VNĐ)',
            data: revenue.map((r) => r.revenue),
            borderColor: '#b7792b',
            backgroundColor: 'rgba(183,121,43,0.15)',
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: '#b7792b',
            tension: 0.35,
            fill: true,
        }],
    };

    const orderStatsData = {
        labels: Object.keys(orderStats),
        datasets: [{
            data: Object.values(orderStats),
            backgroundColor: ['#b7792b', '#1f3a3d', '#6b7c5e', '#8b4a2b', '#57534e'],
            borderWidth: 0,
        }],
    };

    const chartOptions = {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } },
    };

    const doughnutOptions = {
        responsive: true,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } },
    };

    const viFormat = (v) => Number(v).toLocaleString('vi-VN');

    return (
        <div>
            {/* Stat cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} md={8} xl={4}>
                    <AdminStatCard
                        title="Doanh thu"
                        value={summary?.totalRevenue || 0}
                        suffix="đ"
                        icon={<DollarOutlined />}
                        accent={1}
                        formatter={viFormat}
                    />
                </Col>
                <Col xs={24} sm={12} md={8} xl={4}>
                    <AdminStatCard
                        title="Đơn hàng"
                        value={summary?.totalOrders || 0}
                        icon={<ShoppingCartOutlined />}
                        accent={2}
                        sub={`Chờ: ${summary?.pendingOrders || 0} · Đã thanh toán: ${summary?.paidOrders || 0}`}
                    />
                </Col>
                <Col xs={24} sm={12} md={8} xl={4}>
                    <AdminStatCard
                        title="Khách hàng"
                        value={summary?.totalCustomers || 0}
                        icon={<UserOutlined />}
                        accent={3}
                    />
                </Col>
                <Col xs={24} sm={12} md={8} xl={4}>
                    <AdminStatCard
                        title="Sản phẩm"
                        value={summary?.totalProducts || 0}
                        icon={<InboxOutlined />}
                        accent={4}
                    />
                </Col>
                <Col xs={24} sm={12} md={8} xl={4}>
                    <AdminStatCard
                        title="Hoàn trả chờ"
                        value={pendingReturns}
                        icon={<RollbackOutlined />}
                        accent={5}
                    />
                </Col>
                <Col xs={24} sm={12} md={8} xl={4}>
                    <AdminStatCard
                        title="Đã hoàn tiền"
                        value={refundedReturns}
                        icon={<CheckCircleOutlined />}
                        accent={6}
                    />
                </Col>
            </Row>

            {/* Charts */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} lg={16}>
                    <Card className="admin-card" title="Doanh thu theo ngày" bordered={false}>
                        <Line data={revenueChartData} options={chartOptions} />
                    </Card>
                </Col>
                <Col xs={24} lg={8}>
                    <Card className="admin-card" title="Phân bổ đơn hàng" bordered={false}>
                        <Doughnut data={orderStatsData} options={doughnutOptions} />
                    </Card>
                </Col>
            </Row>

            {/* Top products + recent orders */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} lg={12}>
                    <Card className="admin-card" title="Top sản phẩm bán chạy" bordered={false}>
                        <Table
                            dataSource={topProducts}
                            pagination={false}
                            rowKey={(r) => r._id}
                            size="small"
                            className="admin-table"
                            columns={[
                                { title: 'Sản phẩm', render: (_, r) => r.product?.title || 'N/A' },
                                { title: 'Đã bán', dataIndex: 'soldCount', align: 'center', render: (v) => <Tag color="green">{v}</Tag> },
                                { title: 'Tồn kho', dataIndex: 'stock', align: 'center', render: (v) => <Tag color={v > 0 ? 'blue' : 'red'}>{v}</Tag> },
                            ]}
                        />
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card className="admin-card" title="Đơn hàng gần đây" bordered={false}>
                        <Table
                            dataSource={recentOrders}
                            pagination={false}
                            rowKey="_id"
                            size="small"
                            className="admin-table"
                            columns={[
                                { title: 'Mã', dataIndex: '_id', render: (id) => `#${id.slice(-6)}` },
                                { title: 'Khách', dataIndex: 'user', render: (u) => u?.username || 'N/A' },
                                { title: 'Tổng', dataIndex: 'totalPrice', render: (p) => `${p?.toLocaleString('vi-VN')}đ` },
                                { title: 'TT', dataIndex: 'status', render: (s) => <Tag color={orderStatusColors[s]} style={{ fontSize: 11 }}>{s}</Tag> },
                            ]}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Low stock + recent users */}
            <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                    <Card className="admin-card" title="Cảnh báo tồn kho thấp" bordered={false}>
                        {lowStock.length === 0
                            ? <p style={{ color: 'var(--color-muted)', fontSize: 13 }}>Không có sản phẩm tồn kho thấp.</p>
                            : (
                                <Table
                                    dataSource={lowStock}
                                    pagination={false}
                                    rowKey={(r) => r._id}
                                    size="small"
                                    className="admin-table"
                                    columns={[
                                        { title: 'Sản phẩm', render: (_, r) => r.product?.title || 'N/A' },
                                        {
                                            title: 'Tồn kho',
                                            dataIndex: 'stock',
                                            align: 'center',
                                            render: (v) => <Tag color={v <= 2 ? 'red' : 'orange'}>{v}</Tag>,
                                        },
                                    ]}
                                />
                            )}
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card className="admin-card" title="Người dùng mới" bordered={false}>
                        {recentUsers.length === 0
                            ? <p style={{ color: 'var(--color-muted)', fontSize: 13 }}>Chưa có người dùng.</p>
                            : (
                                <Table
                                    dataSource={recentUsers}
                                    pagination={false}
                                    rowKey="_id"
                                    size="small"
                                    className="admin-table"
                                    columns={[
                                        {
                                            title: '',
                                            width: 40,
                                            render: (_, r) => (
                                                <Avatar size={28} style={{ background: '#b7792b', fontSize: 12 }}>
                                                    {(r.fullName || r.username || 'U').charAt(0).toUpperCase()}
                                                </Avatar>
                                            ),
                                        },
                                        { title: 'Tên', dataIndex: 'username' },
                                        { title: 'Email', dataIndex: 'email', ellipsis: true },
                                        {
                                            title: 'Ngày tạo',
                                            dataIndex: 'createdAt',
                                            render: (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—',
                                        },
                                    ]}
                                />
                            )}
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
