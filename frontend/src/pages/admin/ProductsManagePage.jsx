import { Table, Button, Modal, Form, Input, InputNumber, Select, message, Space, Tag, Popconfirm, Card, Typography, Upload, Image } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { useEffect, useState, useCallback } from 'react';
import api, { resolveImageUrl } from '../../utils/api';

const { Title } = Typography;

export default function ProductsManagePage() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [form] = Form.useForm();
    const imageValue = Form.useWatch('images', form);

    const fetchAll = useCallback(() => {
        setLoading(true);
        Promise.all([api.get('/products'), api.get('/categories')])
            .then(([p, c]) => {
                setProducts(Array.isArray(p.data) ? p.data : []);
                setCategories(Array.isArray(c.data) ? c.data : []);
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const openCreate = () => { setEditItem(null); form.resetFields(); setModalOpen(true); };
    const openEdit = (item) => {
        setEditItem(item);
        form.setFieldsValue({ title: item.title, sku: item.sku, price: item.price, description: item.description, category: item.category?._id || item.category, images: item.images?.[0] || '' });
        setModalOpen(true);
    };

    const handleImageUpload = async ({ file, onSuccess, onError }) => {
        try {
            setUploadingImage(true);
            let formData = new FormData();
            formData.append('file', file);
            let response = await api.post('/upload/an_image', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            form.setFieldValue('images', response.data.filename);
            message.success('Da tai anh len server');
            if (onSuccess) {
                onSuccess(response.data, file);
            }
        } catch (err) {
            message.error(err.response?.data?.message || 'Tai anh that bai');
            if (onError) {
                onError(err);
            }
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSave = async () => {
        try {
            let values = await form.validateFields();
            values.images = values.images ? [values.images] : [];
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
            render: (imgs) => <img src={resolveImageUrl(imgs?.[0])} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />
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
                    <Form.Item name="images" label="Anh san pham">
                        <Input placeholder="filename.jpg" readOnly />
                    </Form.Item>
                    <Upload
                        accept="image/*"
                        maxCount={1}
                        showUploadList={false}
                        customRequest={handleImageUpload}
                    >
                        <Button icon={<UploadOutlined />} loading={uploadingImage}>Tai anh tu may tinh</Button>
                    </Upload>
                    {imageValue ? (
                        <div style={{ marginTop: 12 }}>
                            <Image src={resolveImageUrl(imageValue)} alt="preview" width={120} height={120} style={{ objectFit: 'cover', borderRadius: 8 }} />
                        </div>
                    ) : null}
                </Form>
            </Modal>
        </div>
    );
}
