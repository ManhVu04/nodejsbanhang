import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Tag, Typography, Select, Button, Modal, Form, Input, InputNumber, Space, message } from 'antd';
import api from '../../utils/api';

const { Title } = Typography;

const statusColors = {
    Requested: 'orange',
    Approved: 'blue',
    Rejected: 'red',
    Refunded: 'green',
    Cancelled: 'default'
};

export default function ReturnsManagePage() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [openModal, setOpenModal] = useState(false);
    const [form] = Form.useForm();

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        try {
            let params = {};
            if (statusFilter) {
                params.status = statusFilter;
            }
            let response = await api.get('/returns/admin/all', { params });
            setRequests(Array.isArray(response.data?.requests) ? response.data.requests : []);
        } catch (error) {
            message.error(error.response?.data?.message || 'Khong the tai yeu cau doi tra');
            setRequests([]);
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const openReviewModal = (request) => {
        setSelectedRequest(request);
        form.resetFields();
        let defaultStatus = request.status === 'Approved' ? 'Refunded' : 'Approved';
        form.setFieldsValue({
            status: defaultStatus,
            approvedAmount: request.requestedAmount
        });
        setOpenModal(true);
    };

    const handleReview = async () => {
        try {
            let values = await form.validateFields();
            await api.put(`/returns/${selectedRequest._id}/review`, values);
            message.success('Da cap nhat yeu cau doi tra');
            setOpenModal(false);
            fetchRequests();
        } catch (error) {
            if (error.response) {
                message.error(error.response.data?.message || 'Khong the cap nhat');
            }
        }
    };

    const reviewOptions = selectedRequest?.status === 'Approved'
        ? [{ value: 'Refunded', label: 'Hoan tien' }]
        : [
            { value: 'Approved', label: 'Duyet' },
            { value: 'Rejected', label: 'Tu choi' }
        ];

    const columns = [
        { title: 'Ma YC', width: 90, render: (_, record) => `#${record._id.slice(-6)}` },
        { title: 'Khach hang', width: 120, render: (_, record) => record.user?.username || 'N/A' },
        { title: 'Don hang', width: 120, render: (_, record) => `#${record.order?._id?.slice(-8) || 'N/A'}` },
        { title: 'Ly do', dataIndex: 'reason', ellipsis: true },
        {
            title: 'So tien',
            width: 120,
            render: (_, record) => `${record.requestedAmount?.toLocaleString('vi-VN')}d`
        },
        {
            title: 'Trang thai',
            width: 120,
            render: (_, record) => <Tag color={statusColors[record.status]}>{record.status}</Tag>
        },
        {
            title: '',
            width: 100,
            render: (_, record) => (
                <Button
                    size="small"
                    onClick={() => openReviewModal(record)}
                    disabled={record.status === 'Rejected' || record.status === 'Refunded' || record.status === 'Cancelled'}
                >
                    Duyet
                </Button>
            )
        }
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>Yeu cau doi tra va hoan tien</Title>
                <Select
                    value={statusFilter || undefined}
                    placeholder="Loc trang thai"
                    allowClear
                    style={{ width: 180 }}
                    onChange={(value) => setStatusFilter(value || '')}
                    options={[
                        { value: 'Requested', label: 'Requested' },
                        { value: 'Approved', label: 'Approved' },
                        { value: 'Rejected', label: 'Rejected' },
                        { value: 'Refunded', label: 'Refunded' }
                    ]}
                />
            </div>

            <Card style={{ borderRadius: 12 }}>
                <Table rowKey="_id" loading={loading} columns={columns} dataSource={requests} size="small" />
            </Card>

            <Modal
                title="Duyet yeu cau doi tra"
                open={openModal}
                onCancel={() => setOpenModal(false)}
                onOk={handleReview}
                okText="Cap nhat"
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="status" label="Trang thai" rules={[{ required: true }]}>
                        <Select options={reviewOptions} />
                    </Form.Item>
                    <Form.Item name="approvedAmount" label="So tien duyet hoan">
                        <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="refundTransactionId" label="Ma giao dich hoan tien">
                        <Input />
                    </Form.Item>
                    <Form.Item name="adminNote" label="Ghi chu admin">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
