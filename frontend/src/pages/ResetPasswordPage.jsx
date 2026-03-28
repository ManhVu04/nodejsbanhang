import { Form, Input, Button, Card, Typography, message } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import api from '../utils/api';

const { Title, Text } = Typography;

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const token = searchParams.get('token') || '';

    const onFinish = async (values) => {
        if (!token) {
            message.error('Liên kết đặt lại mật khẩu không hợp lệ');
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/resetpassword', { token, password: values.password });
            message.success('Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.');
            navigate('/login');
        } catch (err) {
            message.error(err.response?.data?.message || err.response?.data || 'Không thể đặt lại mật khẩu');
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="auth-page" aria-label="Đặt lại mật khẩu">
            <Card className="auth-card" bodyStyle={{ padding: 32 }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <Title level={2} style={{ margin: 0, color: '#0f172a' }}>
                        Đặt lại mật khẩu
                    </Title>
                    <Text type="secondary">Nhập mật khẩu mới để tiếp tục.</Text>
                </div>

                <Form layout="vertical" onFinish={onFinish} size="large">
                    <Form.Item
                        name="password"
                        rules={[
                            { required: true, message: 'Nhập mật khẩu mới' },
                            { min: 8, message: 'Tối thiểu 8 ký tự' },
                            { pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, message: 'Cần chữ hoa, chữ thường, số và ký tự đặc biệt' }
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu mới" />
                    </Form.Item>

                    <Form.Item
                        name="confirmPassword"
                        dependencies={['password']}
                        rules={[
                            { required: true, message: 'Xác nhận mật khẩu' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('password') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('Mật khẩu không khớp'));
                                }
                            })
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Xác nhận mật khẩu" />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} block style={{ height: 44, borderRadius: 10, fontWeight: 700 }}>
                            Cập nhật mật khẩu
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </section>
    );
}
