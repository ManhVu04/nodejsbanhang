import { Layout, Menu, ConfigProvider, Avatar, Dropdown, Breadcrumb } from 'antd';
import {
    DashboardOutlined, ShoppingOutlined, AppstoreOutlined, InboxOutlined,
    DatabaseOutlined, GiftOutlined, RollbackOutlined, TeamOutlined,
    FileSearchOutlined, LogoutOutlined, UserOutlined, HomeOutlined, DownOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../store/slices/authSlice';
import { clearCart } from '../store/slices/cartSlice';

const { Sider, Content, Header } = Layout;

const adminTheme = {
    token: { colorPrimary: '#b7792b', borderRadius: 10 },
    components: {
        Menu: {
            darkItemBg: 'transparent',
            darkItemSelectedBg: 'rgba(183,121,43,0.18)',
            darkItemSelectedColor: '#e8c98a',
            darkItemHoverBg: 'rgba(255,255,255,0.07)',
        },
        Card: { headerBg: 'transparent', borderRadiusLG: 14 },
        Table: { headerBg: '#f7f3ee' },
    },
};

const menuItems = [
    { key: '/admin', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/admin/products', icon: <ShoppingOutlined />, label: 'Sản phẩm' },
    { key: '/admin/categories', icon: <AppstoreOutlined />, label: 'Danh mục' },
    { key: '/admin/orders', icon: <InboxOutlined />, label: 'Đơn hàng' },
    { key: '/admin/inventory', icon: <DatabaseOutlined />, label: 'Kho hàng' },
    { key: '/admin/vouchers', icon: <GiftOutlined />, label: 'Voucher' },
    { key: '/admin/returns', icon: <RollbackOutlined />, label: 'Đổi trả / Hoàn tiền' },
    { type: 'divider' },
    { key: '/admin/users', icon: <TeamOutlined />, label: 'Người dùng' },
    { key: '/admin/audit-logs', icon: <FileSearchOutlined />, label: 'Nhật ký hệ thống' },
];

const breadcrumbMap = {
    '/admin': 'Dashboard',
    '/admin/products': 'Sản phẩm',
    '/admin/categories': 'Danh mục',
    '/admin/orders': 'Đơn hàng',
    '/admin/inventory': 'Kho hàng',
    '/admin/vouchers': 'Voucher',
    '/admin/returns': 'Đổi trả / Hoàn tiền',
    '/admin/users': 'Người dùng',
    '/admin/audit-logs': 'Nhật ký hệ thống',
};

function getSelectedKey(pathname) {
    if (pathname === '/admin') return '/admin';
    const match = menuItems
        .filter((item) => item.key && item.key !== '/admin' && pathname.startsWith(item.key))
        .sort((a, b) => b.key.length - a.key.length)[0];
    return match?.key || '/admin';
}

function getBreadcrumbItems(pathname) {
    const label = breadcrumbMap[pathname] || breadcrumbMap[Object.keys(breadcrumbMap).find((k) => pathname.startsWith(k) && k !== '/admin')];
    const items = [{ title: <Link to="/admin">Admin</Link> }];
    if (label && pathname !== '/admin') items.push({ title: label });
    return items;
}

export default function AdminLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);

    const handleLogout = async () => {
        await dispatch(logoutUser());
        dispatch(clearCart());
        navigate('/login');
    };

    const userMenuItems = [
        { key: 'home', icon: <HomeOutlined />, label: <Link to="/">Về trang chủ</Link> },
        { type: 'divider' },
        { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', danger: true, onClick: handleLogout },
    ];

    const avatarText = (user?.fullName || user?.username || 'A').trim().charAt(0).toUpperCase();

    return (
        <ConfigProvider theme={adminTheme}>
            <Layout className="admin-shell">
                <Sider
                    className="admin-sidebar"
                    width={240}
                    breakpoint="lg"
                    collapsedWidth="0"
                >
                    <div className="admin-sidebar-brand">
                        <span className="admin-sidebar-brand-dot" />
                        <span>Admin Panel</span>
                    </div>
                    <Menu
                        theme="dark"
                        mode="inline"
                        selectedKeys={[getSelectedKey(location.pathname)]}
                        items={menuItems}
                        onClick={({ key }) => navigate(key)}
                        style={{ background: 'transparent', borderRight: 0, marginTop: 8, padding: '0 0 16px' }}
                    />
                </Sider>

                <Layout>
                    <Header className="admin-topbar">
                        <div className="admin-topbar-left">
                            <Breadcrumb items={getBreadcrumbItems(location.pathname)} />
                        </div>
                        <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
                            <div className="admin-topbar-right">
                                <Avatar size={32} style={{ background: '#b7792b', fontSize: 14 }}>
                                    {avatarText}
                                </Avatar>
                                <span className="admin-topbar-user">{user?.username || 'Admin'}</span>
                                <DownOutlined style={{ fontSize: 11, color: '#888' }} />
                            </div>
                        </Dropdown>
                    </Header>

                    <Content className="admin-content">
                        <Outlet />
                    </Content>
                </Layout>
            </Layout>
        </ConfigProvider>
    );
}
