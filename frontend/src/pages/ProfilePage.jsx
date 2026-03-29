import { Card, Form, Input, Button, Typography, message, Divider, Avatar, Descriptions, Upload, Space } from 'antd';
import { UserOutlined, LockOutlined, UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import api, { resolveImageUrl } from '../utils/api';
import { useEffect, useState } from 'react';
import { fetchMe } from '../store/slices/authSlice';

const { Title } = Typography;

export default function ProfilePage() {
    const dispatch = useDispatch();
    const { user } = useSelector(state => state.auth);
    const [profileForm] = Form.useForm();
    const [passwordForm] = Form.useForm();
    const [updatingProfile, setUpdatingProfile] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    useEffect(() => {
        profileForm.setFieldsValue({
            fullName: user?.fullName || '',
            email: user?.email || '',
            avatarUrl: user?.avatarUrl || ''
        });
    }, [profileForm, user?.fullName, user?.email, user?.avatarUrl]);

    const avatarField = Form.useWatch('avatarUrl', profileForm);
    const avatarPreviewValue = avatarField !== undefined ? avatarField : (user?.avatarUrl || '');
    const resolvedAvatar = (typeof avatarPreviewValue === 'string' && avatarPreviewValue.trim().length > 0)
        ? resolveImageUrl(avatarPreviewValue)
        : undefined;
    const avatarSrc = (typeof user?.avatarUrl === 'string' && user.avatarUrl.trim().length > 0)
        ? resolveImageUrl(user.avatarUrl)
        : undefined;
    const avatarText = (user?.fullName || user?.username || 'U').trim().charAt(0).toUpperCase();

    const handleUploadAvatar = async ({ file, onSuccess, onError }) => {
        try {
            setUploadingAvatar(true);
            let formData = new FormData();
            formData.append('file', file);

            let response = await api.post('/upload/avatar', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            profileForm.setFieldValue('avatarUrl', response.data.filename);
            message.success('Da tai anh dai dien len server');
            if (onSuccess) {
                onSuccess(response.data, file);
            }
        } catch (err) {
            let statusCode = err.response?.status;
            let apiMessage = err.response?.data?.message;
            if (statusCode === 413) {
                message.error('Anh vuot gioi han kich thuoc cua may chu (proxy). Vui long tang client_max_body_size tren server.');
            } else {
                message.error(apiMessage || 'Tai anh that bai');
            }
            if (onError) {
                onError(err);
            }
        } finally {
            setUploadingAvatar(false);
        }
    };

    const onUpdateProfile = async (values) => {
        try {
            setUpdatingProfile(true);
            await api.put('/users/me', {
                fullName: String(values.fullName || '').trim(),
                email: String(values.email || '').trim(),
                avatarUrl: String(values.avatarUrl || '').trim()
            });

            await dispatch(fetchMe()).unwrap();
            message.success('Cap nhat thong tin tai khoan thanh cong');
        } catch (err) {
            message.error(err.response?.data?.message || 'Cap nhat tai khoan that bai');
        } finally {
            setUpdatingProfile(false);
        }
    };

    const handleClearAvatar = () => {
        profileForm.setFieldValue('avatarUrl', '');
        message.info('Da bo anh dai dien. Bam "Cap nhat thong tin" de luu.');
    };

    const onChangePassword = async (values) => {
        try {
            await api.post('/auth/changepassword', {
                oldpassword: values.oldpassword,
                newpassword: values.newpassword
            });
            message.success('Đổi mật khẩu thành công!');
            passwordForm.resetFields();
        } catch (err) {
            message.error(err.response?.data || 'Đổi mật khẩu thất bại');
        }
    };

    return (
        <section className="page-container" style={{ maxWidth: 640 }} aria-label="Tài khoản">
            <Title level={3}>👤 Tài khoản</Title>

            <Card className="surface-card" style={{ borderRadius: 12, marginBottom: 24 }}>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <Avatar src={avatarSrc} icon={!avatarSrc ? <UserOutlined /> : null} size={80} style={{ marginBottom: 12 }}>{!avatarSrc ? avatarText : null}</Avatar>
                </div>
                <Descriptions column={1} bordered size="small">
                    <Descriptions.Item label="Username">{user?.username}</Descriptions.Item>
                    <Descriptions.Item label="Email">{user?.email}</Descriptions.Item>
                    <Descriptions.Item label="Họ tên">{user?.fullName || 'Chưa cập nhật'}</Descriptions.Item>
                    <Descriptions.Item label="Role">{user?.role?.name || 'N/A'}</Descriptions.Item>
                </Descriptions>

                <Divider />

                <Form form={profileForm} layout="vertical" onFinish={onUpdateProfile}>
                    <Form.Item name="fullName" label="Ho ten" rules={[
                        { required: true, message: 'Nhap ho ten' },
                        { min: 2, message: 'Ho ten toi thieu 2 ky tu' }
                    ]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="email" label="Email" rules={[
                        { required: true, message: 'Nhap email' },
                        { type: 'email', message: 'Email khong hop le' }
                    ]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="avatarUrl" label="Anh dai dien">
                        <Input readOnly placeholder="avatar filename" />
                    </Form.Item>
                    <Space direction="vertical" size={12}>
                        <Space wrap>
                            <Upload
                                accept="image/*"
                                maxCount={1}
                                showUploadList={false}
                                customRequest={handleUploadAvatar}
                            >
                                <Button icon={<UploadOutlined />} loading={uploadingAvatar}>Tai anh dai dien tu may tinh</Button>
                            </Upload>
                            <Button
                                icon={<DeleteOutlined />}
                                onClick={handleClearAvatar}
                                disabled={!(typeof avatarPreviewValue === 'string' && avatarPreviewValue.trim().length > 0)}
                            >
                                Xoa anh dai dien
                            </Button>
                        </Space>
                        <Avatar src={resolvedAvatar} icon={<UserOutlined />} size={72} />
                    </Space>
                    <div style={{ marginTop: 16 }}>
                        <Button type="primary" htmlType="submit" loading={updatingProfile}>
                            Cap nhat thong tin
                        </Button>
                    </div>
                </Form>
            </Card>

            <Card title="🔒 Đổi mật khẩu" className="surface-card" style={{ borderRadius: 12 }}>
                <Form form={passwordForm} layout="vertical" onFinish={onChangePassword}>
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
