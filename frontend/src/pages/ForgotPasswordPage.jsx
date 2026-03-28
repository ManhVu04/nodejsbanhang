import { Form, Input, Button, Card, Typography, message } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { useState } from 'react';
import api from '../utils/api';

const { Title, Text } = Typography;

export default function ForgotPasswordPage() {
    const [loading, setLoading] = useState(false);

    const onFinish = async (values) => {
        setLoading(true);
        try {
            await api.post('/auth/forgotpassword', { email: values.email });
            message.success('Nếu email tồn tại, hệ thống đã gửi hướng dẫn đặt lại mật khẩu.');
        } catch (err) {
            message.error(err.response?.data?.message || 'Không thể gửi yêu cầu lúc này');
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="auth-page" aria-label="Quên mật khẩu">
            <Card className="auth-card" bodyStyle={{ padding: 32 }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <Title level={2} style={{ margin: 0, color: '#0f172a' }}>
                        Quên mật khẩu
                    </Title>
                    <Text type="secondary">Nhập email để nhận liên kết đặt lại mật khẩu.</Text>
                </div>

                <Form layout="vertical" onFinish={onFinish} size="large">
                    <Form.Item
                        name="email"
                        rules={[
                            { required: true, message: 'Nhập email' },
                            { type: 'email', message: 'Email không hợp lệ' }
                        ]}
                    >
                        <Input prefix={<MailOutlined />} placeholder="Email" />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} block style={{ height: 44, borderRadius: 10, fontWeight: 700 }}>
                            Gửi liên kết đặt lại
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </section>
    );
}
