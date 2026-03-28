import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, Switch, Space, Popconfirm, Typography, message, Tag, DatePicker } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../utils/api';

const { Title } = Typography;

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
        { title: 'Code', dataIndex: 'code', width: 140, render: (code) => <Tag color="blue">{code}</Tag> },
        { title: 'Loai', dataIndex: 'discountType', width: 100 },
        {
            title: 'Gia tri',
            dataIndex: 'discountValue',
            width: 100,
            render: (_, record) => record.discountType === 'PERCENT' ? `${record.discountValue}%` : `${record.discountValue?.toLocaleString('vi-VN')}d`
        },
        { title: 'Da dung', dataIndex: 'usedCount', width: 90 },
        {
            title: 'Trang thai',
            width: 120,
            render: (_, record) => (
                <Tag color={record.isActive ? 'green' : 'red'}>{record.isActive ? 'Active' : 'Inactive'}</Tag>
            )
        },
        {
            title: '',
            width: 90,
            render: (_, record) => (
                <Space>
                    <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
                    <Popconfirm title="Xoa voucher nay?" onConfirm={() => handleDelete(record._id)}>
                        <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>Quan ly voucher</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Them voucher</Button>
            </div>

            <Card style={{ borderRadius: 12 }}>
                <Table rowKey="_id" loading={loading} columns={columns} dataSource={vouchers} size="small" />
            </Card>

            <Modal
                title={editItem ? 'Cap nhat voucher' : 'Tao voucher'}
                open={openModal}
                onCancel={() => setOpenModal(false)}
                onOk={handleSave}
                okText="Luu"
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="code" label="Ma voucher" rules={[{ required: true }]}>
                        <Input placeholder="VD: GIAM10" />
                    </Form.Item>
                    <Form.Item name="description" label="Mo ta">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                    <Form.Item name="discountType" label="Loai giam" rules={[{ required: true }]}>
                        <Select options={[{ value: 'PERCENT', label: 'Phan tram' }, { value: 'FIXED', label: 'So tien co dinh' }]} />
                    </Form.Item>
                    <Form.Item name="discountValue" label="Gia tri giam" rules={[{ required: true }]}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="minOrderValue" label="Don toi thieu">
                        <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="maxDiscount" label="Giam toi da">
                        <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="usageLimit" label="Tong luot su dung">
                        <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="perUserLimit" label="Luot dung / user">
                        <InputNumber min={1} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="startsAt" label="Bat dau">
                        <DatePicker showTime style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="expiresAt" label="Ket thuc">
                        <DatePicker showTime style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="isActive" label="Kich hoat" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
