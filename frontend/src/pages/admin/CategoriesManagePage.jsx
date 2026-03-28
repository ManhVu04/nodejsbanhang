import { Table, Button, Modal, Form, Input, message, Space, Popconfirm, Card, Typography, Upload, Image } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { useEffect, useState, useCallback } from 'react';
import api, { resolveImageUrl } from '../../utils/api';

const { Title } = Typography;

export default function CategoriesManagePage() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [form] = Form.useForm();
    const imageValue = Form.useWatch('image', form);

    const fetchCategories = useCallback(() => {
        setLoading(true);
        api.get('/categories').then(res => setCategories(Array.isArray(res.data) ? res.data : []))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const openCreate = () => { setEditItem(null); form.resetFields(); setModalOpen(true); };
    const openEdit = (item) => {
        setEditItem(item);
        form.setFieldsValue({ name: item.name, image: item.image });
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

            form.setFieldValue('image', response.data.filename);
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
            if (editItem) {
                await api.put(`/categories/${editItem._id}`, values);
                message.success('Cập nhật thành công');
            } else {
                await api.post('/categories', values);
                message.success('Thêm danh mục thành công');
            }
            setModalOpen(false);
            fetchCategories();
        } catch (err) {
            if (err.response) message.error(err.response.data?.message || err.response.data);
        }
    };

    const handleDelete = async (id) => {
        await api.delete(`/categories/${id}`);
        message.success('Đã xóa');
        fetchCategories();
    };

    const columns = [
        {
            title: 'Ảnh', dataIndex: 'image', width: 70,
            render: (img) => <img src={resolveImageUrl(img)} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />
        },
        { title: 'Tên', dataIndex: 'name' },
        { title: 'Slug', dataIndex: 'slug', ellipsis: true },
        {
            title: '', key: 'actions', width: 100,
            render: (_, r) => (
                <Space>
                    <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
                    <Popconfirm title="Xóa danh mục?" onConfirm={() => handleDelete(r._id)}>
                        <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>Quản lý danh mục</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
                    style={{ borderRadius: 8, background: '#764ba2', border: 'none' }}>Thêm danh mục</Button>
            </div>
            <Card style={{ borderRadius: 12 }}>
                <Table dataSource={categories.filter(c => !c.isDeleted)} columns={columns} loading={loading} rowKey="_id" size="small" />
            </Card>

            <Modal title={editItem ? 'Sửa danh mục' : 'Thêm danh mục'} open={modalOpen}
                onCancel={() => setModalOpen(false)} onOk={handleSave} okText="Lưu">
                <Form form={form} layout="vertical">
                    <Form.Item name="name" label="Tên" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="image" label="Anh danh muc">
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
