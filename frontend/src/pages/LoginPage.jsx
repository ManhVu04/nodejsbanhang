import { Form, Input, Button, Card, Typography, message, Divider } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, clearError } from '../store/slices/authSlice';
import { syncGuestCart, fetchCart } from '../store/slices/cartSlice';
import { useEffect } from 'react';

const { Title, Text } = Typography;

export default function LoginPage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { loading, error } = useSelector(state => state.auth);

    useEffect(() => {
        dispatch(clearError());
    }, [dispatch]);

    const onFinish = async (values) => {
        try {
            await dispatch(loginUser(values)).unwrap();
            // Sync guest cart & fetch server cart
            await dispatch(syncGuestCart());
            await dispatch(fetchCart());
            message.success('Đăng nhập thành công!');
            navigate('/');
        } catch (err) {
            message.error(err || 'Đăng nhập thất bại');
        }
    };

    return (
        <section className="auth-page" aria-label="Đăng nhập">
            <Card className="auth-card" bodyStyle={{ padding: 32 }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <Title level={2} style={{ margin: 0, color: '#0f172a' }}>
                        Đăng nhập
                    </Title>
                    <Text type="secondary">Chào mừng bạn trở lại!</Text>
                </div>

                {error && <div style={{ color: '#ff4d4f', marginBottom: 16, textAlign: 'center' }}>{error}</div>}

                <Form layout="vertical" onFinish={onFinish} size="large">
                    <Form.Item name="username" rules={[{ required: true, message: 'Nhập tên đăng nhập' }]}>
                        <Input prefix={<UserOutlined />} placeholder="Tên đăng nhập" />
                    </Form.Item>
                    <Form.Item name="password" rules={[{ required: true, message: 'Nhập mật khẩu' }]}>
                        <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} block
                            style={{ height: 44, borderRadius: 10, fontWeight: 700 }}>
                            Đăng nhập
                        </Button>
                    </Form.Item>
                </Form>
                <Divider />
                <div style={{ textAlign: 'center' }}>
                    <Text type="secondary">Chưa có tài khoản? </Text>
                    <Link to="/register" style={{ fontWeight: 600 }}>Đăng ký ngay</Link>
                </div>
                <div style={{ textAlign: 'center', marginTop: 8 }}>
                    <Link to="/forgot-password">Quên mật khẩu?</Link>
                </div>
            </Card>
        </section>
    );
}
