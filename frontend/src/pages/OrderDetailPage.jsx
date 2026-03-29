import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { Card, Typography, Table, Tag, Spin, Button, Divider, Descriptions, Modal, Form, Input, InputNumber, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import api from '../utils/api';

const { Title, Text } = Typography;
const statusColors = { Pending: 'orange', Paid: 'blue', Shipped: 'cyan', Delivered: 'green', Cancelled: 'red' };
const statusLabels = { Pending: 'Chờ xử lý', Paid: 'Đã thanh toán', Shipped: 'Đang giao', Delivered: 'Đã giao', Cancelled: 'Đã hủy' };
const afterSaleColors = { None: 'default', Requested: 'orange', Approved: 'blue', Rejected: 'red', Refunded: 'green' };
const afterSaleLabels = { None: 'Khong', Requested: 'Dang yeu cau', Approved: 'Da duyet', Rejected: 'Bi tu choi', Refunded: 'Da hoan tien' };

export default function OrderDetailPage() {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [returnRequest, setReturnRequest] = useState(null);
    const [returnModalOpen, setReturnModalOpen] = useState(false);
    const [returnSubmitting, setReturnSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [form] = Form.useForm();
    const navigate = useNavigate();

    const fetchOrderDetail = useCallback(async () => {
        try {
            setLoading(true);
            let [orderRes, returnRes] = await Promise.all([
                api.get(`/orders/${id}`),
                api.get('/returns/my', { params: { orderId: id, limit: 1 } }).catch(() => ({ data: { requests: [] } }))
            ]);
            setData(orderRes.data);
            let requests = Array.isArray(returnRes.data?.requests) ? returnRes.data.requests : [];
            setReturnRequest(requests[0] || null);
        } catch {
            navigate('/orders');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        fetchOrderDetail();
    }, [fetchOrderDetail]);

    const handleCreateReturnRequest = async () => {
        try {
            let values = await form.validateFields();
            setReturnSubmitting(true);
            await api.post('/returns', {
                orderId: id,
                reason: values.reason,
                details: values.details,
                requestedAmount: values.requestedAmount
            });
            message.success('Da gui yeu cau doi tra');
            setReturnModalOpen(false);
            form.resetFields();
            fetchOrderDetail();
        } catch (error) {
            if (error.response) {
                message.error(error.response.data?.message || 'Khong the tao yeu cau doi tra');
            }
        } finally {
            setReturnSubmitting(false);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
    if (!data) return null;

    const { order, payment } = data;
    const canCreateReturn = ['Delivered', 'Paid'].includes(order.status)
        && (!returnRequest || ['Rejected', 'Cancelled'].includes(returnRequest.status));

    const columns = [
        {
            title: 'Sản phẩm', dataIndex: 'product', key: 'product',
            render: p => <span style={{ fontWeight: 500 }}>{p?.title || 'N/A'}</span>
        },
        { title: 'Đơn giá', dataIndex: 'priceAtPurchase', render: p => `${p?.toLocaleString('vi-VN')}đ` },
        { title: 'SL', dataIndex: 'quantity', align: 'center' },
        { title: 'Thành tiền', dataIndex: 'subtotal', render: s => <Text strong style={{ color: '#e74c3c' }}>{s?.toLocaleString('vi-VN')}đ</Text> }
    ];

    return (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/orders')} style={{ marginBottom: 16 }}>Quay lại</Button>
            <Card style={{ borderRadius: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Title level={4} style={{ margin: 0 }}>Đơn hàng #{order._id.slice(-8)}</Title>
                    <Tag color={statusColors[order.status]} style={{ fontSize: 14, padding: '4px 12px' }}>{statusLabels[order.status]}</Tag>
                </div>
                <Descriptions size="small" column={2}>
                    <Descriptions.Item label="Ngày đặt">{new Date(order.createdAt).toLocaleString('vi-VN')}</Descriptions.Item>
                    <Descriptions.Item label="Thanh toán">{order.paymentMethod}</Descriptions.Item>
                    <Descriptions.Item label="Địa chỉ">{order.shippingAddress || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Ghi chú">{order.note || 'Không'}</Descriptions.Item>
                    <Descriptions.Item label="Hau mai">
                        <Tag color={afterSaleColors[order.afterSaleStatus || 'None']}>
                            {afterSaleLabels[order.afterSaleStatus || 'None']}
                        </Tag>
                    </Descriptions.Item>
                    {payment && <Descriptions.Item label="TT thanh toán"><Tag color={payment.status === 'paid' ? 'green' : 'orange'}>{payment.status}</Tag></Descriptions.Item>}
                </Descriptions>
                <Divider />
                <Table dataSource={order.items} columns={columns} pagination={false} rowKey={(r, i) => i} />
                <div style={{ textAlign: 'right', marginTop: 16, padding: 16, background: '#f0fdf4', borderRadius: 8 }}>
                    <Text style={{ display: 'block' }}>Tam tinh: {(order.subTotalPrice || order.totalPrice || 0).toLocaleString('vi-VN')}d</Text>
                    <Text style={{ display: 'block', color: '#dc2626' }}>Giam gia: -{(order.discountAmount || 0).toLocaleString('vi-VN')}d</Text>
                    <Title level={3} style={{ margin: 0, color: '#16a34a' }}>Tong: {order.totalPrice?.toLocaleString('vi-VN')}d</Title>
                </div>

                <Divider />
                <div>
                    <Title level={5}>Yeu cau doi tra / hoan tien</Title>
                    {returnRequest ? (
                        <Card size="small" style={{ borderRadius: 10 }}>
                            <p><strong>Trang thai:</strong> <Tag color={afterSaleColors[returnRequest.status] || 'default'}>{returnRequest.status}</Tag></p>
                            <p><strong>Ly do:</strong> {returnRequest.reason}</p>
                            <p><strong>Chi tiet:</strong> {returnRequest.details || 'Khong co'}</p>
                            <p><strong>So tien yeu cau:</strong> {returnRequest.requestedAmount?.toLocaleString('vi-VN')}d</p>
                            {returnRequest.approvedAmount > 0 ? <p><strong>So tien duyet:</strong> {returnRequest.approvedAmount?.toLocaleString('vi-VN')}d</p> : null}
                            {returnRequest.adminNote ? <p><strong>Ghi chu admin:</strong> {returnRequest.adminNote}</p> : null}
                        </Card>
                    ) : (
                        <Text type="secondary">Ban chua tao yeu cau doi tra cho don hang nay.</Text>
                    )}

                    {canCreateReturn ? (
                        <Button type="primary" style={{ marginTop: 12 }} onClick={() => setReturnModalOpen(true)}>
                            Tao yeu cau doi tra
                        </Button>
                    ) : null}
                </div>
            </Card>

            <Modal
                title="Tao yeu cau doi tra"
                open={returnModalOpen}
                onCancel={() => setReturnModalOpen(false)}
                onOk={handleCreateReturnRequest}
                confirmLoading={returnSubmitting}
                okText="Gui yeu cau"
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="reason" label="Ly do" rules={[{ required: true, message: 'Vui long nhap ly do' }]}>
                        <Input placeholder="VD: San pham loi, sai mo ta..." />
                    </Form.Item>
                    <Form.Item name="details" label="Chi tiet them">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                    <Form.Item name="requestedAmount" label="So tien mong muon hoan" initialValue={order.totalPrice}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
