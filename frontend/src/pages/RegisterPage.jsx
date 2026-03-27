import { Form, Input, Button, Card, Typography, message, Divider } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser, clearError } from '../store/slices/authSlice';
import { useEffect } from 'react';

const { Title, Text } = Typography;

export default function RegisterPage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { loading, error } = useSelector(state => state.auth);

    useEffect(() => {
        dispatch(clearError());
    }, []);

    const onFinish = async (values) => {
        try {
            await dispatch(registerUser(values)).unwrap();
            message.success('Đăng ký thành công! Vui lòng đăng nhập.');
            navigate('/login');
        } catch (err) {
            message.error(err || 'Đăng ký thất bại');
        }
    };

    return (
        <section className="auth-page" aria-label="Đăng ký">
            <Card className="auth-card" bodyStyle={{ padding: 32 }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <Title level={2} style={{ margin: 0, color: '#0f172a' }}>
                        Đăng ký
                    </Title>
                    <Text type="secondary">Tạo tài khoản mới</Text>
                </div>

                {error && <div style={{ color: '#ff4d4f', marginBottom: 16, textAlign: 'center' }}>{error}</div>}

                <Form layout="vertical" onFinish={onFinish} size="large">
                    <Form.Item name="username" rules={[{ required: true, message: 'Nhập tên đăng nhập' }, { min: 3, message: 'Tối thiểu 3 ký tự' }]}>
                        <Input prefix={<UserOutlined />} placeholder="Tên đăng nhập" />
                    </Form.Item>
                    <Form.Item name="email" rules={[{ required: true, message: 'Nhập email' }, { type: 'email', message: 'Email không hợp lệ' }]}>
                        <Input prefix={<MailOutlined />} placeholder="Email" />
                    </Form.Item>
                    <Form.Item name="password" rules={[{ required: true, message: 'Nhập mật khẩu' }, { min: 6, message: 'Tối thiểu 6 ký tự' }]}>
                        <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" />
                    </Form.Item>
                    <Form.Item name="confirmPassword" dependencies={['password']}
                        rules={[{ required: true, message: 'Xác nhận mật khẩu' },
                        ({ getFieldValue }) => ({ validator(_, value) { if (!value || getFieldValue('password') === value) return Promise.resolve(); return Promise.reject('Mật khẩu không khớp'); } })]}>
                        <Input.Password prefix={<LockOutlined />} placeholder="Xác nhận mật khẩu" />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} block
                            style={{ height: 44, borderRadius: 10, fontWeight: 700 }}>
                            Đăng ký
                        </Button>
                    </Form.Item>
                </Form>
                <Divider />
                <div style={{ textAlign: 'center' }}>
                    <Text type="secondary">Đã có tài khoản? </Text>
                    <Link to="/login" style={{ fontWeight: 600 }}>Đăng nhập</Link>
                </div>
            </Card>
        </section>
    );
}
