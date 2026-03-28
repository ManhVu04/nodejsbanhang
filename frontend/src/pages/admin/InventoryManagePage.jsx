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
    const [form] = Form.useForm();

    const fetchInventories = useCallback(() => {
        setLoading(true);
        api.get('/inventories').then(res => setInventories(res.data.inventories || []))
            .finally(() => setLoading(false));
    }, []);

    const fetchLogs = useCallback(() => {
        api.get('/inventories/logs?limit=50').then(res => setLogs(res.data.logs || [])).catch(() => {});
    }, []);

    useEffect(() => {
        let cancelled = false;

        Promise.all([
            api.get('/inventories'),
            api.get('/inventories/logs?limit=50').catch(() => ({ data: { logs: [] } }))
        ]).then(([inventoriesRes, logsRes]) => {
            if (cancelled) {
                return;
            }
            setInventories(inventoriesRes.data.inventories || []);
            setLogs(logsRes.data.logs || []);
        }).finally(() => {
            if (!cancelled) {
                setLoading(false);
            }
        });

        return () => {
            cancelled = true;
        };
    }, []);

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
            fetchInventories();
            fetchLogs();
        } catch (err) {
            if (err.response) message.error(err.response.data?.message || 'Lỗi');
        }
    };

    const invColumns = [
        {
            title: 'Ảnh', width: 60,
            render: (_, r) => <img src={resolveImageUrl(r.product?.images?.[0])} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }} />
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
                            <Table dataSource={inventories} columns={invColumns} loading={loading} rowKey="_id" size="small" />
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
