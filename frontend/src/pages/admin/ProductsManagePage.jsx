import { Table, Button, Modal, Form, Input, InputNumber, Select, message, Space, Tag, Popconfirm, Card, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import api from '../../utils/api';

const { Title } = Typography;

export default function ProductsManagePage() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [form] = Form.useForm();

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = () => {
        setLoading(true);
        Promise.all([api.get('/products'), api.get('/categories')])
            .then(([p, c]) => { setProducts(p.data || []); setCategories(c.data || []); })
            .finally(() => setLoading(false));
    };

    const openCreate = () => { setEditItem(null); form.resetFields(); setModalOpen(true); };
    const openEdit = (item) => {
        setEditItem(item);
        form.setFieldsValue({ title: item.title, sku: item.sku, price: item.price, description: item.description, category: item.category?._id || item.category, images: item.images?.[0] || '' });
        setModalOpen(true);
    };

    const handleSave = async () => {
        try {
            let values = await form.validateFields();
            if (values.images) values.images = [values.images];
            if (editItem) {
                await api.put(`/products/${editItem._id}`, values);
                message.success('Cập nhật thành công');
            } else {
                await api.post('/products', values);
                message.success('Thêm sản phẩm thành công');
            }
            setModalOpen(false);
            fetchAll();
        } catch (err) {
            if (err.response) message.error(err.response.data?.message || err.response.data);
        }
    };

    const handleDelete = async (id) => {
        await api.delete(`/products/${id}`);
        message.success('Đã xóa');
        fetchAll();
    };

    const columns = [
        {
            title: 'Ảnh', dataIndex: 'images', width: 70,
            render: imgs => <img src={imgs?.[0] || 'https://i.imgur.com/cHddUCu.jpeg'} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />
        },
        { title: 'Tên', dataIndex: 'title', ellipsis: true },
        { title: 'SKU', dataIndex: 'sku', width: 100 },
        { title: 'Giá', dataIndex: 'price', width: 120, render: p => `${p?.toLocaleString('vi-VN')}đ` },
        { title: 'Danh mục', dataIndex: 'category', width: 120, render: c => <Tag color="purple">{c?.name || 'N/A'}</Tag> },
        {
            title: '', key: 'actions', width: 100,
            render: (_, r) => (
                <Space>
                    <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
                    <Popconfirm title="Xóa sản phẩm?" onConfirm={() => handleDelete(r._id)}>
                        <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>Quản lý sản phẩm</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
                    style={{ borderRadius: 8, background: '#764ba2', border: 'none' }}>Thêm sản phẩm</Button>
            </div>
            <Card style={{ borderRadius: 12 }}>
                <Table dataSource={products} columns={columns} loading={loading} rowKey="_id" size="small" />
            </Card>

            <Modal title={editItem ? 'Sửa sản phẩm' : 'Thêm sản phẩm'} open={modalOpen}
                onCancel={() => setModalOpen(false)} onOk={handleSave} okText="Lưu">
                <Form form={form} layout="vertical">
                    <Form.Item name="title" label="Tên SP" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="sku" label="SKU" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="price" label="Giá" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="category" label="Danh mục" rules={[{ required: true }]}>
                        <Select>{categories.filter(c => !c.isDeleted).map(c => <Select.Option key={c._id} value={c._id}>{c.name}</Select.Option>)}</Select>
                    </Form.Item>
                    <Form.Item name="description" label="Mô tả"><Input.TextArea rows={3} /></Form.Item>
                    <Form.Item name="images" label="URL ảnh"><Input placeholder="https://..." /></Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
