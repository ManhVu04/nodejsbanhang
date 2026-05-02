import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, Switch, Tag, Avatar, Popconfirm, message, Card, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../../utils/api';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

export default function UsersManagePage() {
    const [users, setUsers] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState();
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [roles, setRoles] = useState([]);
    const [refreshKey, setRefreshKey] = useState(0);
    const [form] = Form.useForm();

    const refreshUsers = () => setRefreshKey((k) => k + 1);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            try {
                const res = await api.get('/users', { params: { page, limit: 10, search, isActive: activeFilter } });
                if (cancelled) return;
                const data = Array.isArray(res.data?.users) ? res.data.users : [];
                setUsers(data);
                setTotal(Number(res.data?.total || data.length));
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [page, search, activeFilter, refreshKey]);

    useEffect(() => {
        api.get('/roles').then((res) => setRoles(Array.isArray(res.data) ? res.data : []));
    }, []);

    const openCreate = () => {
        setEditing(null);
        form.resetFields();
        setModalOpen(true);
    };

    const openEdit = (user) => {
        setEditing(user);
        form.setFieldsValue({
            username: user.username,
            email: user.email,
            fullName: user.fullName || '',
            role: user.role?._id || user.role,
            isActive: user.isActive !== false,
        });
        setModalOpen(true);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            if (editing) {
                await api.put(`/users/${editing._id}`, {
                    fullName: values.fullName,
                    email: values.email,
                    role: values.role,
                    isActive: values.isActive,
                });
                message.success('Cập nhật người dùng thành công');
            } else {
                await api.post('/users', {
                    username: values.username,
                    password: values.password,
                    email: values.email,
                    fullName: values.fullName,
                    role: values.role,
                });
                message.success('Tạo người dùng thành công');
            }
            setModalOpen(false);
            refreshUsers();
        } catch (err) {
            const msg = err?.response?.data?.message || err.message;
            if (msg) message.error(msg);
        }
    };

    const handleToggleActive = async (record, isActive) => {
        try {
            await api.patch(`/users/${record._id}/active`, { isActive });
            message.success(isActive ? 'Đã kích hoạt người dùng' : 'Đã vô hiệu hóa người dùng');
            refreshUsers();
        } catch (err) {
            message.error(err?.response?.data?.message || 'Cập nhật trạng thái thất bại');
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/users/${id}`);
            message.success('Đã xóa người dùng');
            refreshUsers();
        } catch (err) {
            message.error(err?.response?.data?.message || 'Xóa thất bại');
        }
    };

    const columns = [
        {
            title: '',
            width: 48,
            render: (_, r) => (
                <Avatar size={32} style={{ background: '#b7792b', fontSize: 13 }}>
                    {(r.fullName || r.username || 'U').charAt(0).toUpperCase()}
                </Avatar>
            ),
        },
        { title: 'Tên đăng nhập', dataIndex: 'username', ellipsis: true },
        { title: 'Email', dataIndex: 'email', ellipsis: true },
        { title: 'Họ tên', dataIndex: 'fullName', ellipsis: true, render: (v) => v || '—' },
        {
            title: 'Vai trò',
            render: (_, r) => {
                const name = r.role?.name || 'User';
                return <Tag color={name === 'Admin' ? 'gold' : 'default'}>{name}</Tag>;
            },
        },
        {
            title: 'Trạng thái',
            width: 130,
            render: (_, r) => <Switch checked={r.isActive !== false} onChange={(checked) => handleToggleActive(r, checked)} checkedChildren="Bật" unCheckedChildren="Tắt" />,
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'createdAt',
            render: (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—'),
        },
        {
            title: 'Hành động',
            width: 100,
            render: (_, r) => (
                <Space size={4}>
                    <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
                    <Popconfirm
                        title="Xóa người dùng này?"
                        onConfirm={() => handleDelete(r._id)}
                        okText="Xóa"
                        cancelText="Hủy"
                    >
                        <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <AdminPageHeader
                title="Người dùng"
                subtitle="Quản lý tài khoản người dùng"
                breadcrumb={[{ label: 'Admin', to: '/admin' }, { label: 'Người dùng' }]}
                actions={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm người dùng</Button>}
            />
            <Card className="admin-card" bordered={false}>
                <Space style={{ marginBottom: 16 }} wrap>
                    <Input.Search
                        allowClear
                        placeholder="Tìm tên, email, họ tên"
                        onSearch={(value) => { setPage(1); setSearch(value); }}
                        style={{ width: 260 }}
                    />
                    <Select
                        allowClear
                        placeholder="Trạng thái"
                        value={activeFilter}
                        onChange={(value) => { setPage(1); setActiveFilter(value); }}
                        style={{ width: 160 }}
                        options={[
                            { value: true, label: 'Đang hoạt động' },
                            { value: false, label: 'Đã vô hiệu hóa' },
                        ]}
                    />
                </Space>
                <Table
                    dataSource={users}
                    columns={columns}
                    loading={loading}
                    rowKey="_id"
                    size="middle"
                    className="admin-table"
                    scroll={{ x: 700 }}
                    pagination={{ total, current: page, pageSize: 10, onChange: setPage, showSizeChanger: false }}
                />
            </Card>

            <Modal
                title={editing ? 'Sửa người dùng' : 'Thêm người dùng'}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={handleSave}
                okText="Lưu"
                cancelText="Hủy"
                destroyOnClose
            >
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    {!editing && (
                        <Form.Item name="username" label="Tên đăng nhập" rules={[{ required: true, message: 'Bắt buộc' }]}>
                            <Input />
                        </Form.Item>
                    )}
                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[
                            { required: true, message: 'Bắt buộc' },
                            { type: 'email', message: 'Email không hợp lệ' },
                        ]}
                    >
                        <Input />
                    </Form.Item>
                    {!editing && (
                        <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, message: 'Bắt buộc' }]}>
                            <Input.Password />
                        </Form.Item>
                    )}
                    <Form.Item name="fullName" label="Họ tên">
                        <Input />
                    </Form.Item>
                    <Form.Item name="role" label="Vai trò" rules={[{ required: true, message: 'Chọn vai trò' }]}>
                        <Select placeholder="Chọn vai trò">
                            {roles.map((r) => (
                                <Select.Option key={r._id} value={r._id}>{r.name}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    {editing && (
                        <Form.Item name="isActive" label="Kích hoạt" valuePropName="checked">
                            <Switch />
                        </Form.Item>
                    )}
                </Form>
            </Modal>
        </div>
    );
}
