import { Card, Form, Input, Button, Typography, message, Divider, Avatar, Descriptions } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import api, { resolveImageUrl } from '../utils/api';

const { Title } = Typography;

export default function ProfilePage() {
    const { user } = useSelector(state => state.auth);
    const avatarSrc = (typeof user?.avatarUrl === 'string' && user.avatarUrl.trim().length > 0)
        ? resolveImageUrl(user.avatarUrl)
        : undefined;
    const avatarText = (user?.fullName || user?.username || 'U').trim().charAt(0).toUpperCase();

    const onChangePassword = async (values) => {
        try {
            await api.post('/auth/changepassword', {
                oldpassword: values.oldpassword,
                newpassword: values.newpassword
            });
            message.success('Đổi mật khẩu thành công!');
        } catch (err) {
            message.error(err.response?.data || 'Đổi mật khẩu thất bại');
        }
    };

    return (
        <section className="page-container" style={{ maxWidth: 640 }} aria-label="Tài khoản">
            <Title level={3}>👤 Tài khoản</Title>

            <Card className="surface-card" style={{ borderRadius: 12, marginBottom: 24, textAlign: 'center' }}>
                <Avatar src={avatarSrc} icon={!avatarSrc ? <UserOutlined /> : null} size={80} style={{ marginBottom: 16 }}>{!avatarSrc ? avatarText : null}</Avatar>
                <Descriptions column={1} bordered size="small">
                    <Descriptions.Item label="Username">{user?.username}</Descriptions.Item>
                    <Descriptions.Item label="Email">{user?.email}</Descriptions.Item>
                    <Descriptions.Item label="Họ tên">{user?.fullName || 'Chưa cập nhật'}</Descriptions.Item>
                    <Descriptions.Item label="Role">{user?.role?.name || 'N/A'}</Descriptions.Item>
                </Descriptions>
            </Card>

            <Card title="🔒 Đổi mật khẩu" className="surface-card" style={{ borderRadius: 12 }}>
                <Form layout="vertical" onFinish={onChangePassword}>
                    <Form.Item name="oldpassword" label="Mật khẩu cũ" rules={[{ required: true, message: 'Nhập mật khẩu cũ' }]}>
                        <Input.Password prefix={<LockOutlined />} />
                    </Form.Item>
                    <Form.Item name="newpassword" label="Mật khẩu mới" rules={[
                        { required: true, message: 'Nhập mật khẩu mới' },
                        { min: 8, message: 'Tối thiểu 8 ký tự' },
                        { pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, message: 'Cần chữ hoa, chữ thường, số và ký tự đặc biệt' }
                    ]}>
                        <Input.Password prefix={<LockOutlined />} />
                    </Form.Item>
                    <Form.Item name="confirm" label="Xác nhận" dependencies={['newpassword']}
                        rules={[{ required: true, message: 'Xác nhận mật khẩu' }, ({ getFieldValue }) => ({
                            validator(_, v) { return !v || getFieldValue('newpassword') === v ? Promise.resolve() : Promise.reject('Không khớp'); }
                        })]}>
                        <Input.Password prefix={<LockOutlined />} />
                    </Form.Item>
                    <Button type="primary" htmlType="submit"
                        style={{ borderRadius: 8 }}>
                        Cập nhật mật khẩu
                    </Button>
                </Form>
            </Card>
        </section>
    );
}
