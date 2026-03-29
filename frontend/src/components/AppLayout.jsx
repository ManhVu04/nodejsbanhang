import { Layout, Menu, Badge, Dropdown, Avatar, Input, Space, Drawer, Button } from 'antd';
import { ShoppingCartOutlined, UserOutlined, LogoutOutlined, DashboardOutlined, AppstoreOutlined, LoginOutlined, UserAddOutlined, ShoppingOutlined, SearchOutlined, MenuOutlined, HeartOutlined } from '@ant-design/icons';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logoutUser } from '../store/slices/authSlice';
import { clearCart } from '../store/slices/cartSlice';
import { useState } from 'react';
import { resolveImageUrl } from '../utils/api';

const { Header, Content, Footer } = Layout;
const { Search } = Input;

export default function AppLayout() {
    const { user } = useSelector(state => state.auth);
    const { items } = useSelector(state => state.cart);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [drawerOpen, setDrawerOpen] = useState(false);

    const cartCount = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const isAdmin = user?.role?.name === 'Admin';
    const avatarSrc = (typeof user?.avatarUrl === 'string' && user.avatarUrl.trim().length > 0)
        ? resolveImageUrl(user.avatarUrl)
        : undefined;
    const avatarText = (user?.fullName || user?.username || 'U').trim().charAt(0).toUpperCase();

    const handleLogout = async () => {
        await dispatch(logoutUser());
        dispatch(clearCart());
        navigate('/login');
    };

    const handleSearch = (value) => {
        if (value.trim()) {
            navigate(`/products?q=${encodeURIComponent(value.trim())}`);
            setDrawerOpen(false);
        }
    };

    const navItems = [
        { key: 'products', icon: <AppstoreOutlined />, label: <Link to="/products">Sản phẩm</Link> },
        { key: 'cart', icon: <ShoppingCartOutlined />, label: <Link to="/cart">Giỏ hàng</Link> },
        ...(user ? [
            { key: 'orders', icon: <ShoppingOutlined />, label: <Link to="/orders">Đơn hàng</Link> },
            { key: 'wishlist', icon: <HeartOutlined />, label: <Link to="/wishlist">Yêu thích</Link> }
        ] : []),
        ...(isAdmin ? [{ key: 'admin', icon: <DashboardOutlined />, label: <Link to="/admin">Quản trị</Link> }] : []),
        ...(!user ? [
            { key: 'login', icon: <LoginOutlined />, label: <Link to="/login">Đăng nhập</Link> },
            { key: 'register', icon: <UserAddOutlined />, label: <Link to="/register">Đăng ký</Link> }
        ] : [])
    ];

    const userMenuItems = user ? [
        { key: 'profile', icon: <UserOutlined />, label: <Link to="/profile">Tài khoản</Link> },
        { key: 'orders', icon: <ShoppingOutlined />, label: <Link to="/orders">Đơn hàng</Link> },
        { key: 'wishlist', icon: <HeartOutlined />, label: <Link to="/wishlist">Yêu thích</Link> },
        ...(isAdmin ? [{ key: 'admin', icon: <DashboardOutlined />, label: <Link to="/admin">Admin Dashboard</Link> }] : []),
        { type: 'divider' },
        { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', onClick: handleLogout, danger: true }
    ] : [];

    return (
        <Layout className="app-shell">
            <Header className="app-shell__header" role="banner">
                <div className="app-shell__header-inner">
                    <Link to="/" className="app-shell__brand" aria-label="MiniShop Home">
                        <span>MiniShop</span>
                    </Link>

                    <div className="app-shell__search">
                        <Search
                            placeholder="Tìm kiếm sản phẩm..."
                            onSearch={handleSearch}
                            enterButton={<SearchOutlined />}
                            allowClear
                            aria-label="Search products"
                        />
                    </div>

                    <div className="app-shell__actions">
                        <Link to="/products" className="app-shell__nav-link app-shell__desktop-link">
                            Sản phẩm
                        </Link>
                        <Link to="/cart" aria-label="Giỏ hàng">
                            <Badge count={cartCount} size="small" offset={[-2, 2]}>
                                <ShoppingCartOutlined style={{ fontSize: 20, color: '#111' }} />
                            </Badge>
                        </Link>
                        {user ? (
                            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
                                <Space style={{ cursor: 'pointer', color: '#111' }} className="app-shell__user-summary">
                                    <Avatar src={avatarSrc} icon={!avatarSrc ? <UserOutlined /> : null} size="small">{!avatarSrc ? avatarText : null}</Avatar>
                                    <span className="app-shell__user-name">{user.fullName || user.username}</span>
                                </Space>
                            </Dropdown>
                        ) : (
                            <Space className="app-shell__auth-links">
                                <Link to="/login" style={{ color: '#111' }}><LoginOutlined /> Đăng nhập</Link>
                                <Link to="/register" style={{ color: '#111' }}><UserAddOutlined /> Đăng ký</Link>
                            </Space>
                        )}
                        <Button
                            aria-label="Open navigation menu"
                            icon={<MenuOutlined />}
                            onClick={() => setDrawerOpen(true)}
                            className="app-shell__menu-button"
                            style={{ background: 'transparent', borderColor: '#d4d4d8', color: '#111' }}
                        />
                    </div>
                </div>
            </Header>

            <Drawer
                title="Điều hướng"
                placement="right"
                width={300}
                onClose={() => setDrawerOpen(false)}
                open={drawerOpen}
            >
                <Menu
                    mode="inline"
                    items={navItems}
                    onClick={() => setDrawerOpen(false)}
                    style={{ borderInlineEnd: 0 }}
                />
            </Drawer>

            <Content className="app-shell__content" role="main">
                <Outlet />
            </Content>

            <Footer className="app-shell__footer">
                MiniShop E-commerce ©2026 — Built with React, Ant Design & Express.js
            </Footer>
        </Layout>
    );
}
