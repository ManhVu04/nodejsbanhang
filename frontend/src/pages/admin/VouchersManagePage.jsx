import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, Switch, Space, Popconfirm, message, Tag, DatePicker } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../utils/api';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

function toDayjs(dateString) {
    return dateString ? dayjs(dateString) : null;
}

export default function VouchersManagePage() {
    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openModal, setOpenModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [form] = Form.useForm();

    const fetchVouchers = useCallback(async () => {
        setLoading(true);
        try {
            let response = await api.get('/vouchers');
            setVouchers(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            message.error(error.response?.data?.message || 'Khong the tai voucher');
            setVouchers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchVouchers();
    }, [fetchVouchers]);

    const openCreate = () => {
        setEditItem(null);
        form.resetFields();
        form.setFieldsValue({ discountType: 'PERCENT', isActive: true, perUserLimit: 1 });
        setOpenModal(true);
    };

    const openEdit = (item) => {
        setEditItem(item);
        form.setFieldsValue({
            ...item,
            startsAt: toDayjs(item.startsAt),
            expiresAt: toDayjs(item.expiresAt)
        });
        setOpenModal(true);
    };

    const handleSave = async () => {
        try {
            let values = await form.validateFields();
            let payload = {
                ...values,
                startsAt: values.startsAt ? values.startsAt.toISOString() : null,
                expiresAt: values.expiresAt ? values.expiresAt.toISOString() : null
            };

            if (editItem) {
                await api.put(`/vouchers/${editItem._id}`, payload);
                message.success('Da cap nhat voucher');
            } else {
                await api.post('/vouchers', payload);
                message.success('Da tao voucher');
            }

            setOpenModal(false);
            fetchVouchers();
        } catch (error) {
            if (error.response) {
                message.error(error.response.data?.message || 'Khong the luu voucher');
            }
        }
    };

    const handleToggleActive = async (record, isActive) => {
        try {
            await api.put(`/vouchers/${record._id}`, { isActive });
            message.success(isActive ? 'Đã kích hoạt voucher' : 'Đã tắt voucher');
            fetchVouchers();
        } catch (error) {
            message.error(error.response?.data?.message || 'Không thể cập nhật voucher');
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/vouchers/${id}`);
            message.success('Da xoa voucher');
            fetchVouchers();
        } catch (error) {
            message.error(error.response?.data?.message || 'Khong the xoa voucher');
        }
    };

    const columns = [
        { title: 'Mã', dataIndex: 'code', width: 140, render: (code) => <Tag color="blue">{code}</Tag> },
        { title: 'Loại', dataIndex: 'discountType', width: 100 },
        {
            title: 'Giá trị',
            dataIndex: 'discountValue',
            width: 100,
            render: (_, record) => record.discountType === 'PERCENT' ? `${record.discountValue}%` : `${record.discountValue?.toLocaleString('vi-VN')}d`
        },
        { title: 'Đã dùng', dataIndex: 'usedCount', width: 90 },
        {
            title: 'Trạng thái',
            width: 130,
            render: (_, record) => <Switch checked={record.isActive} onChange={(checked) => handleToggleActive(record, checked)} checkedChildren="Bật" unCheckedChildren="Tắt" />
        },
        {
            title: '',
            width: 90,
            render: (_, record) => (
                <Space>
                    <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} aria-label={`Sửa voucher ${record?.code || ''}`} />
                    <Popconfirm title="Xoa voucher nay?" onConfirm={() => handleDelete(record._id)}>
                        <Button size="small" danger icon={<DeleteOutlined />} aria-label={`Xóa voucher ${record?.code || ''}`} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div>
            <AdminPageHeader
                title="Voucher"
                subtitle="Quản lý mã giảm giá"
                breadcrumb={[{ label: 'Admin', to: '/admin' }, { label: 'Voucher' }]}
                actions={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm voucher</Button>}
            />
            <Card className="admin-card" bordered={false}>
                <Table rowKey="_id" loading={loading} columns={columns} dataSource={vouchers} size="middle" className="admin-table" scroll={{ x: 800 }} />
            </Card>

            <Modal
                title={editItem ? 'Cập nhật voucher' : 'Tạo voucher'}
                open={openModal}
                onCancel={() => setOpenModal(false)}
                onOk={handleSave}
                okText="Lưu"
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="code" label="Mã voucher" rules={[{ required: true }]}>
                        <Input placeholder="VD: GIAM10" />
                    </Form.Item>
                    <Form.Item name="description" label="Mô tả">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                    <Form.Item name="discountType" label="Loại giảm" rules={[{ required: true }]}>
                        <Select options={[{ value: 'PERCENT', label: 'Phần trăm' }, { value: 'FIXED', label: 'Số tiền cố định' }]} />
                    </Form.Item>
                    <Form.Item name="discountValue" label="Giá trị giảm" rules={[{ required: true }]}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="minOrderValue" label="Đơn tối thiểu">
                        <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="maxDiscount" label="Giảm tối đa">
                        <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="usageLimit" label="Tổng lượt sử dụng">
                        <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="perUserLimit" label="Lượt dùng / người">
                        <InputNumber min={1} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="startsAt" label="Bắt đầu">
                        <DatePicker showTime style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="expiresAt" label="Kết thúc">
                        <DatePicker showTime style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="isActive" label="Kích hoạt" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
