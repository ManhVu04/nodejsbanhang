import { Table, Button, Modal, Form, InputNumber, Input, message, Card, Typography, Tag, Tabs } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useEffect, useState, useCallback } from 'react';
import api, { resolveImageUrl } from '../../utils/api';

const { Title } = Typography;

export default function InventoryManagePage() {
    const [inventories, setInventories] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [inventoryPage, setInventoryPage] = useState(1);
    const [inventoryPageSize, setInventoryPageSize] = useState(10);
    const [inventoryTotal, setInventoryTotal] = useState(0);
    const [form] = Form.useForm();

    const fetchInventories = useCallback(async (page = 1, limit = 10) => {
        try {
            setLoading(true);
            const res = await api.get('/inventories', {
                params: {
                    page,
                    limit
                }
            });
            const payload = res?.data || {};
            const nextInventories = Array.isArray(payload?.inventories) ? payload?.inventories : [];
            const nextTotal = Number(payload?.total || 0);
            const nextPage = Number(payload?.page || page);
            const nextLimit = Number(payload?.limit || limit);

            setInventories(nextInventories);
            setInventoryTotal(Number.isFinite(nextTotal) ? nextTotal : 0);
            setInventoryPage(Number.isFinite(nextPage) ? nextPage : 1);
            setInventoryPageSize(Number.isFinite(nextLimit) ? nextLimit : limit);
        } catch (err) {
            message.error(err?.response?.data?.message || err?.response?.data || 'Không thể tải dữ liệu kho hàng');
            setInventories([]);
            setInventoryTotal(0);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchLogs = useCallback(async () => {
        try {
            const res = await api.get('/inventories/logs?limit=50');
            setLogs(res?.data?.logs || []);
        } catch {
            setLogs([]);
        }
    }, []);

    useEffect(() => {
        fetchInventories(1, inventoryPageSize);
        fetchLogs();
    }, [fetchInventories, fetchLogs, inventoryPageSize]);

    const openAddStock = (product) => {
        setSelectedProduct(product);
        form.resetFields();
        setModalOpen(true);
    };

    const handleAddStock = async () => {
        try {
            let values = await form.validateFields();
            await api.post(`/inventories/${selectedProduct._id}/stock`, values);
            message.success('Nhập kho thành công');
            setModalOpen(false);
            await fetchInventories(inventoryPage, inventoryPageSize);
            await fetchLogs();
        } catch (err) {
            if (err?.response) message.error(err?.response?.data?.message || 'Lỗi');
        }
    };

    const handleInventoryTableChange = (pagination) => {
        const nextPage = Number(pagination?.current || 1);
        const nextPageSize = Number(pagination?.pageSize || inventoryPageSize);
        fetchInventories(nextPage, nextPageSize);
    };

    const invColumns = [
        {
            title: 'Ảnh', width: 60,
            render: (_, r) => <img alt={r?.product?.title || 'product'} src={resolveImageUrl(r?.product?.images?.[0])} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }} />
        },
        { title: 'Sản phẩm', render: (_, r) => r.product?.title || 'N/A' },
        { title: 'SKU', render: (_, r) => r.product?.sku || 'N/A', width: 100 },
        {
            title: 'Tồn kho', dataIndex: 'stock', width: 100, align: 'center',
            render: v => <Tag color={v > 0 ? 'green' : 'red'}>{v}</Tag>
        },
        { title: 'Đã bán', dataIndex: 'soldCount', width: 80, align: 'center', render: v => <Tag color="blue">{v}</Tag> },
        {
            title: '', width: 100,
            render: (_, r) => (
                <Button size="small" icon={<PlusOutlined />} onClick={() => openAddStock(r.product)}
                    style={{ borderRadius: 6 }}>Nhập kho</Button>
            )
        }
    ];

    const logColumns = [
        { title: 'Sản phẩm', render: (_, r) => r.product?.title || 'N/A', ellipsis: true },
        {
            title: 'Loại', dataIndex: 'type', width: 80,
            render: t => <Tag color={t === 'IN' ? 'green' : t === 'OUT' ? 'red' : 'orange'}>{t}</Tag>
        },
        { title: 'SL', dataIndex: 'quantity', width: 60, align: 'center' },
        { title: 'Lý do', dataIndex: 'reason', ellipsis: true },
        { title: 'Người thực hiện', render: (_, r) => r.performedBy?.username || 'System', width: 120 },
        { title: 'Thời gian', dataIndex: 'createdAt', width: 140, render: d => new Date(d).toLocaleString('vi-VN') }
    ];

    return (
        <div>
            <Title level={4}>Quản lý kho hàng</Title>
            <Tabs items={[
                {
                    key: 'inventory', label: '📦 Tồn kho',
                    children: (
                        <Card style={{ borderRadius: 12 }}>
                            <Table
                                dataSource={inventories}
                                columns={invColumns}
                                loading={loading}
                                rowKey="_id"
                                size="small"
                                onChange={handleInventoryTableChange}
                                pagination={{
                                    current: inventoryPage,
                                    pageSize: inventoryPageSize,
                                    total: inventoryTotal,
                                    showSizeChanger: true,
                                    pageSizeOptions: ['10', '20', '50'],
                                    showTotal: (total) => `${total} sản phẩm`
                                }}
                            />
                        </Card>
                    )
                },
                {
                    key: 'logs', label: '📋 Lịch sử nhập/xuất',
                    children: (
                        <Card style={{ borderRadius: 12 }}>
                            <Table dataSource={logs} columns={logColumns} rowKey="_id" size="small" />
                        </Card>
                    )
                }
            ]} />

            <Modal title={`Nhập kho: ${selectedProduct?.title || ''}`} open={modalOpen}
                onCancel={() => setModalOpen(false)} onOk={handleAddStock} okText="Nhập kho">
                <Form form={form} layout="vertical">
                    <Form.Item name="quantity" label="Số lượng" rules={[{ required: true }]}>
                        <InputNumber min={1} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="reason" label="Lý do">
                        <Input placeholder="Nhập kho đợt mới, v.v." />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
