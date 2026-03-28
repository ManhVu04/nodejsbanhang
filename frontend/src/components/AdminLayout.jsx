import { Layout, Menu } from 'antd';
import { DashboardOutlined, ShoppingOutlined, AppstoreOutlined, InboxOutlined, DatabaseOutlined, ArrowLeftOutlined, GiftOutlined, RollbackOutlined } from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const { Sider, Content } = Layout;

const menuItems = [
    { key: '/admin', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/admin/products', icon: <ShoppingOutlined />, label: 'Sản phẩm' },
    { key: '/admin/categories', icon: <AppstoreOutlined />, label: 'Danh mục' },
    { key: '/admin/orders', icon: <InboxOutlined />, label: 'Đơn hàng' },
    { key: '/admin/inventory', icon: <DatabaseOutlined />, label: 'Kho hàng' },
    { key: '/admin/vouchers', icon: <GiftOutlined />, label: 'Voucher' },
    { key: '/admin/returns', icon: <RollbackOutlined />, label: 'Đổi trả / Hoàn tiền' },
    { type: 'divider' },
    { key: '/', icon: <ArrowLeftOutlined />, label: 'Về trang chủ' }
];

export default function AdminLayout() {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <Layout style={{ minHeight: 'calc(100vh - 134px)' }}>
            <Sider
                width={220}
                breakpoint="lg"
                collapsedWidth="0"
                style={{
                    background: 'linear-gradient(180deg, #0f172a 0%, #134e4a 100%)',
                    paddingTop: 16
                }}
            >
                <div style={{ color: '#fff', textAlign: 'center', padding: '0 16px 16px', fontSize: 16, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    ⚙️ Admin Panel
                </div>
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    items={menuItems}
                    onClick={({ key }) => navigate(key)}
                    style={{ background: 'transparent', borderRight: 0, marginTop: 8 }}
                />
            </Sider>
            <Content style={{ padding: 16, background: 'transparent', overflow: 'auto' }}>
                <Outlet />
            </Content>
        </Layout>
    );
}
